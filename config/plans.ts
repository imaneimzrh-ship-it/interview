// Single source of truth for plan configuration.
// Backend routes, in-app UI, and landing page all import from here.
// Change a number here to reprice everywhere at once.

export const CREDIT_COSTS = {
  cv_diagnostic:      1,
  practice_exercise:  1,
  mock_panel_session: 3,
} as const

export type ActionType = keyof typeof CREDIT_COSTS

export const FREE_PLAN = {
  label:          'Free',
  price_monthly:  0,
  credits_total:  3,
  renews_monthly: false,
  includes: [
    'CV Diagnostic',
    'RAG System Design practice',
    'Community Database — browse, submit, upvote, comment',
    'Question Bank & Tools Glossary',
  ],
  excludes: [
    'Agent Orchestration, Evaluation & Testing, Production/MLOps practice',
    'Mock Panel Simulation',
  ],
} as const

export const PRO_PLAN = {
  label:          'Pro',
  price_monthly:  39.99,
  credits_total:  50,
  renews_monthly: true,
  includes: [
    'Everything in Free',
    '50 credits every month',
    'All Practice Hub topics (RAG, Agent Orchestration, Evaluation & Testing, Production/MLOps)',
    'All 3 Mock Panel Simulation loops',
  ],
} as const

// Pro-only topic pillars (RAG is the free topic)
export const PRO_ONLY_PILLARS = ['agent_orchestration', 'evaluation_testing', 'production_mlops'] as const
