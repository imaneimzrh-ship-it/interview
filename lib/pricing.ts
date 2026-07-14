// Single source of truth for all pricing tiers.
// Import this in every component that shows pricing or plan copy.
// Numbers derive from config/plans.ts — do not hardcode separately.

import { FREE_PLAN, PRO_PLAN } from '@/config/plans'

export const CURRENCY = '$'

export const FREE_TIER = {
  name:        FREE_PLAN.label,
  price:       FREE_PLAN.price_monthly,
  period:      null as null,
  description: `${FREE_PLAN.credits_total} credits to try the platform, one time`,
  features:    FREE_PLAN.includes as unknown as string[],
  locked:      FREE_PLAN.excludes as unknown as string[],
  cta:         'Try it free',
  ctaHref:     '/signup',
}

export const PRO_TIER = {
  name:        PRO_PLAN.label,
  price:       PRO_PLAN.price_monthly,
  period:      'month' as const,
  description: `${PRO_PLAN.credits_total} credits every month, renews monthly`,
  features:    PRO_PLAN.includes as unknown as string[],
  locked:      [] as string[],
  cta:         'Upgrade to Pro →',
  ctaHref:     '/pricing',
}

export const FREE_SHORT = `CV diagnostic + RAG practice · ${FREE_PLAN.credits_total} free credits one-time · community database`
export const PRO_SHORT  = `All 4 topics · mock panel simulations · ${PRO_PLAN.credits_total} credits/month`

export const PRICING_NOTE  = `You're interviewing for roles that pay ${CURRENCY}100K–${CURRENCY}500K+. This costs ${CURRENCY}${PRO_TIER.price}/month.`
export const REFUND_NOTE   = ''
export const SUPPORT_EMAIL = 'support@sonneai.com'
