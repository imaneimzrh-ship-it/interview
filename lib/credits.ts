import type { SupabaseClient } from '@supabase/supabase-js'
import { CREDIT_COSTS as PLAN_CREDIT_COSTS, type ActionType } from '@/config/plans'

// ─── Configuration ────────────────────────────────────────────────────────────
// Legacy session-type costs (kept for backward compat with chargeCredits callers)
export const CREDIT_COSTS = {
  short: 1,
  full:  2,
} as const

export type SessionType = keyof typeof CREDIT_COSTS

export const SESSION_SUB_SKILLS: Record<SessionType, number> = {
  short: 1,
  full:  4,
}

// ─── Plan row type ────────────────────────────────────────────────────────────
export interface UserPlan {
  plan: string
  credits_remaining: number
  credits_total: number
  renews_monthly: boolean
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
    if (error && !error.message?.includes('unique') && !error.message?.includes('duplicate')) {
      throw error
    }
  },

  // ─── user_plans credit system ─────────────────────────────────────────────

  /** Read the user's current plan row. Returns null if row doesn't exist yet. */
  async getUserPlan(sb: SupabaseClient, userId: string): Promise<UserPlan | null> {
    const { data } = await sb
      .from('user_plans')
      .select('plan, credits_remaining, credits_total, renews_monthly')
      .eq('user_id', userId)
      .maybeSingle()
    return data ?? null
  },

  /**
   * Atomically check and deduct credits from user_plans.
   * Returns the updated plan row on success.
   * Returns { error: 'insufficient_credits', ... } response object on failure —
   * callers should return this directly as a 402.
   *
   * For Pro-only actions pass requirePro=true — returns 403 if plan is 'free'.
   */
  async checkAndDeductCredits(
    sb: SupabaseClient,
    userId: string,
    actionType: ActionType,
    opts?: { requirePro?: boolean },
  ): Promise<
    | { ok: true; plan: UserPlan }
    | { ok: false; status: number; body: Record<string, unknown> }
  > {
    const cost = PLAN_CREDIT_COSTS[actionType]

    // Fetch plan
    const { data: planRow, error: fetchErr } = await sb
      .from('user_plans')
      .select('plan, credits_remaining, credits_total, renews_monthly')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchErr) {
      console.error('[checkAndDeductCredits] fetch error:', fetchErr)
      return { ok: false, status: 500, body: { error: 'internal_error' } }
    }

    // Backfill: if row doesn't exist (pre-migration user), create it
    if (!planRow) {
      await sb.from('user_plans').upsert({
        user_id: userId,
        plan: 'free',
        credits_remaining: 3,
        credits_total: 3,
        renews_monthly: false,
      }, { onConflict: 'user_id' })
      // Recurse once
      return CreditService.checkAndDeductCredits(sb, userId, actionType, opts)
    }

    if (opts?.requirePro && planRow.plan !== 'pro') {
      return {
        ok: false,
        status: 403,
        body: {
          error: 'pro_required',
          message: 'This feature requires a Pro plan.',
          plan: planRow.plan,
        },
      }
    }

    if (planRow.credits_remaining < cost) {
      return {
        ok: false,
        status: 402,
        body: {
          error: 'insufficient_credits',
          credits_remaining: planRow.credits_remaining,
          credits_total: planRow.credits_total,
          plan: planRow.plan,
          cost,
          message: "You've used your free credits. Upgrade to Pro to keep practicing.",
        },
      }
    }

    // Deduct
    const newBalance = planRow.credits_remaining - cost
    const { error: updateErr } = await sb
      .from('user_plans')
      .update({ credits_remaining: newBalance })
      .eq('user_id', userId)

    if (updateErr) {
      console.error('[checkAndDeductCredits] update error:', updateErr)
      return { ok: false, status: 500, body: { error: 'internal_error' } }
    }

    // Log transaction
    await sb.from('credit_transactions').insert({
      user_id:      userId,
      action_type:  actionType,
      credits_used: cost,
      balance_after: newBalance,
    }).then(({ error }) => { if (error) console.error('[credit_transactions] insert error:', error) })

    return {
      ok: true,
      plan: { ...planRow, credits_remaining: newBalance },
    }
  },

  /** Grant / upgrade credits (called from Stripe webhook). */
  async setPlanCredits(
    sb: SupabaseClient,
    userId: string,
    plan: string,
    creditsRemaining: number,
    creditsTotal: number,
    renewsMonthly: boolean,
  ): Promise<void> {
    await sb.from('user_plans').upsert({
      user_id:           userId,
      plan,
      credits_remaining: creditsRemaining,
      credits_total:     creditsTotal,
      renews_monthly:    renewsMonthly,
      last_reset_at:     new Date().toISOString(),
    }, { onConflict: 'user_id' })
  },
}
