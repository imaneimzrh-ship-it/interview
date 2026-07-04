import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Configuration ────────────────────────────────────────────────────────────
// Costs are in credits. Change here to reprice without touching route logic.
export const CREDIT_COSTS = {
  short: 1,  // 1 sub-skill only — covered by signup bonus
  full:  2,  // all 4 sub-skills
} as const

export type SessionType = keyof typeof CREDIT_COSTS

export const SESSION_SUB_SKILLS: Record<SessionType, number> = {
  short: 1,
  full:  4,
}

// ─── Error ────────────────────────────────────────────────────────────────────
export class InsufficientCreditsError extends Error {
  readonly code = 'insufficient_credits' as const
  constructor(public readonly balance: number, public readonly needed: number) {
    super(`insufficient_credits: have ${balance}, need ${needed}`)
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────
// All methods take the service-role (admin) Supabase client so they can write
// to tables regardless of RLS. The charge_credits RPC is SECURITY DEFINER and
// handles its own privilege escalation.

export const CreditService = {

  /** Current non-expired credit balance for a user. */
  async getBalance(sb: SupabaseClient, userId: string): Promise<number> {
    const now = new Date().toISOString()
    const { data, error } = await sb
      .from('credits_ledger')
      .select('delta')
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
    if (error) throw error
    return (data ?? []).reduce((sum, r) => sum + (r.delta as number), 0)
  },

  /**
   * Credit a user's account (purchase, refill, or bonus grant).
   * Called from Stripe webhook or admin tooling — always use service role.
   */
  async grantCredits(
    sb: SupabaseClient,
    userId: string,
    delta: number,
    reason: 'signup_bonus' | 'purchase' | 'subscription_refill',
    expiresAt?: Date,
  ): Promise<void> {
    const { error } = await sb.from('credits_ledger').insert({
      user_id:    userId,
      delta,
      reason,
      expires_at: expiresAt?.toISOString() ?? null,
    })
    if (error) throw error
  },

  /**
   * Atomically check balance and deduct credits.
   * Uses a Postgres SECURITY DEFINER function with an advisory lock so two
   * concurrent requests for the same user cannot both pass the balance check.
   * The sessionId is the idempotency key — retried requests are no-ops.
   * Throws InsufficientCreditsError if balance < amount.
   */
  async chargeCredits(
    sb: SupabaseClient,
    userId: string,
    amount: number,
    sessionId: string,
  ): Promise<void> {
    // Read balance first so we can include it in the error (UX-only, not authoritative)
    const balance = await CreditService.getBalance(sb, userId)

    const { error } = await sb.rpc('charge_credits', {
      p_user_id:   userId,
      p_amount:    amount,
      p_reference: sessionId,
    })

    if (error) {
      if (error.message?.includes('insufficient_credits')) {
        throw new InsufficientCreditsError(balance, amount)
      }
      console.error('[CreditService.chargeCredits]', error)
      throw error
    }
  },

  /**
   * Returns true if this user (by user_id or email) has already consumed
   * their one free CV score.  Checks email too so re-registration can't bypass it.
   */
  async hasUsedFreeCvScore(
    sb: SupabaseClient,
    userId: string,
    email: string,
  ): Promise<boolean> {
    const { data } = await sb
      .from('cv_score_usage')
      .select('user_id')
      .or(`user_id.eq.${userId},email.eq.${email}`)
      .limit(1)
    return (data?.length ?? 0) > 0
  },

  /**
   * Record that this user has used their free CV score.
   * Idempotent — duplicate inserts on the unique email index are swallowed.
   */
  async markCvScoreUsed(
    sb: SupabaseClient,
    userId: string,
    email: string,
  ): Promise<void> {
    const { error } = await sb
      .from('cv_score_usage')
      .upsert({ user_id: userId, email }, { onConflict: 'user_id' })
    // Ignore unique-constraint violations (concurrent duplicate request)
    if (error && !error.message?.includes('unique') && !error.message?.includes('duplicate')) {
      throw error
    }
  },
}
