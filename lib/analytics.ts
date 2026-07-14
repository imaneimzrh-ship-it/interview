/**
 * Funnel analytics — all events land in Supabase `analytics_events` table.
 * Works both server-side (service role key) and client-side (anon key via RLS).
 * Call `trackEvent` anywhere; it is fire-and-forget (never throws to the caller).
 */

export type FunnelEvent =
  | { name: 'signup_completed';            user_id: string; method?: string }
  | { name: 'interview_session_started';   user_id: string; session_id: string; module_slug: string; lang: string }
  | { name: 'screening_round_completed';   user_id: string; session_id: string; sub_skill_idx: number }
  | { name: 'technical_exercise_opened';   user_id: string; session_id: string; exercise_id: string }
  | { name: 'technical_exercise_submitted';user_id: string; session_id: string; exercise_id: string; overall_score: number; pass_fail: string }
  | { name: 'session_fully_completed';     user_id: string; session_id: string; module_slug?: string }

/**
 * Server-side: call with Supabase client already instantiated.
 * Avoids importing supabase-js in this file so it stays isomorphic.
 */
export async function trackServerEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  event: FunnelEvent
): Promise<void> {
  try {
    const { name, ...properties } = event
    await sb.from('analytics_events').insert({ event_name: name, properties })
  } catch (err) {
    // Analytics must never crash the main flow
    console.error('[analytics] trackServerEvent failed:', err)
  }
}

/**
 * Client-side: fires via fetch to avoid importing the server Supabase client.
 * Uses the dedicated /api/analytics/track endpoint (see route.ts).
 */
export function trackClientEvent(event: FunnelEvent): void {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => { /* fire-and-forget */ })
}

/**
 * Fire a GA4 / Google Ads event via window.gtag.
 * Safe to call on any page — no-ops if gtag hasn't loaded yet.
 * Also fires as a Google Ads conversion when send_to is provided.
 *
 * Usage:
 *   trackGtagEvent('signup_completed', { method: 'email' })
 *   trackGtagEvent('conversion', { send_to: 'AW-18314404853/LABEL' })
 */
export function trackGtagEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag
  if (typeof gtag !== 'function') return
  try {
    gtag('event', eventName, params ?? {})
  } catch {
    // never crash the caller
  }
}
