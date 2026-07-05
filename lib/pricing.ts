// Single source of truth for all pricing tiers.
// Import this in every component that shows pricing or plan copy.

export const CURRENCY = '$'

export const FREE_TIER = {
  name: 'Free',
  price: 0,
  period: null as null,
  description: 'Sign up free · No card required',
  features: [
    '1 free interview session — RAG System Design module',
    'Adaptive Claude follow-up questions',
    'Headline diagnostic (overall score + top strength/gap)',
    'EN / FR bilingual',
  ],
  locked: [
    'Unlimited sessions',
    'All module access across sessions',
    'Full per-skill diagnostic breakdown',
  ],
  cta: 'Start free',
  ctaHref: '/signup',
}

export const PRO_TIER = {
  name: 'Pro',
  price: 39.99,
  period: 'month' as const,
  description: 'Cancel anytime · no further charges',
  features: [
    'Everything in Free',
    'Unlimited sessions — any module, any time',
    'All 4 modules: RAG · Agents · Evaluation · MLOps',
    'Full diagnostic breakdown (per-skill scores, evidence, improvement plan)',
    'CV readiness diagnostic — full 5-signal breakdown',
    'EN / FR bilingual support',
  ],
  locked: [],
  cta: 'Get Pro →',
  ctaHref: '/pricing',
}

// Short human-readable summaries used in non-pricing surfaces (settings, banners, etc.)
export const FREE_SHORT = 'CV diagnostic + 1 RAG session · headline score'
export const PRO_SHORT  = 'All 4 modules · unlimited sessions · full diagnostic breakdowns'

export const PRICING_NOTE  = `You're interviewing for roles that pay ${CURRENCY}100K–${CURRENCY}500K+. This costs ${CURRENCY}${PRO_TIER.price}/month.`
export const REFUND_NOTE   = ''
export const SUPPORT_EMAIL = 'support@sonneai.com'
