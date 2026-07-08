// Single source of truth for all pricing tiers.
// Import this in every component that shows pricing or plan copy.

export const CURRENCY = '$'

export const FREE_TIER = {
  name: 'Free',
  price: 0,
  period: null as null,
  description: 'Sign up free · No card required',
  features: [
    '1 interview session — RAG System Design module',
    'Adaptive follow-up questions + trade-off probing',
    'Headline diagnostic (overall score + top strength/gap)',
    'CV readiness diagnostic — full 5-signal breakdown',
    'EN / FR bilingual',
  ],
  locked: [
    'Unlimited sessions across all modules',
    'Agent Orchestration · Evaluation · Production/MLOps modules',
    'Full per-sub-skill diagnostic with evidence quotes',
    'Trade-off Reasoning scorecard dimension',
    'Practical coding & debug questions',
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
    'All 4 modules: RAG · Agents · Evaluation · Production/MLOps',
    'Expanded sub-skills: Memory Management · Tool Creation · MCP · Observability · Guardrails',
    'Trade-off Reasoning scoring — did you explain WHY, not just what',
    'Practical coding questions: debug broken code, review flawed AI output',
    'Voice mode — speak your answers, interviewer speaks back',
    'Full per-sub-skill diagnostic with evidence quotes + improvement plan',
    'Question bank — see what real AI engineers were asked',
  ],
  locked: [],
  cta: 'Get Pro →',
  ctaHref: '/pricing',
}

// Short human-readable summaries used in non-pricing surfaces (settings, banners, etc.)
export const FREE_SHORT = 'CV diagnostic + 1 RAG session · headline score · trade-off probing'
export const PRO_SHORT  = 'All 4 modules · voice mode · practical coding · trade-off scoring · unlimited sessions'

export const PRICING_NOTE  = `You're interviewing for roles that pay ${CURRENCY}100K–${CURRENCY}500K+. This costs ${CURRENCY}${PRO_TIER.price}/month.`
export const REFUND_NOTE   = ''
export const SUPPORT_EMAIL = 'support@sonneai.com'
