// Config-driven mapping from CV diagnostic signal keys → interview modules.
// Add new signal keys here without touching any routing or UI logic.
export interface ModuleTarget {
  slug: string        // matches MODULES[].id on the start page
  name: string        // display name
  emoji: string
  free: boolean       // whether this module is on the free tier
  subSkillSlug?: string // default sub-skill to surface in the module
}

export const GAP_TO_MODULE: Record<string, ModuleTarget> = {
  rag:        { slug: 'rag_system_design',   name: 'RAG System Design',    emoji: '🔍', free: true,  subSkillSlug: 'retrieval_quality' },
  agentic:    { slug: 'agent_orchestration', name: 'Agent Orchestration',  emoji: '🕵️', free: false, subSkillSlug: 'tool_use_design' },
  eval:       { slug: 'evaluation_testing',  name: 'Evaluation & Testing', emoji: '🧪', free: false, subSkillSlug: 'eval_design' },
  production: { slug: 'production_mlops',    name: 'Production / MLOps',   emoji: '⚙️', free: false, subSkillSlug: 'observability_tracing' },
  cost:       { slug: 'production_mlops',    name: 'Production / MLOps',   emoji: '⚙️', free: false, subSkillSlug: 'guardrails_safe_failure' },
}

// Sub-skill slug → module slug (for AI-returned recommendSubSkill routing)
export const SUB_SKILL_TO_MODULE: Record<string, string> = {
  chunking_strategy:          'rag_system_design',
  retrieval_quality:          'rag_system_design',
  reranking:                  'rag_system_design',
  rag_freshness:              'rag_system_design',
  tool_use_design:            'agent_orchestration',
  memory_management:          'agent_orchestration',
  tool_creation_validation:   'agent_orchestration',
  multi_agent_coordination:   'agent_orchestration',
  failure_handling_recovery:  'agent_orchestration',
  mcp_integration:            'production_mlops',
  eval_design:                'evaluation_testing',
  hallucination_detection:    'evaluation_testing',
  offline_online_eval:        'evaluation_testing',
  regression_gates:           'evaluation_testing',
  observability_tracing:      'production_mlops',
  guardrails_safe_failure:    'production_mlops',
  cost_latency_optimisation:  'production_mlops',
  deployment_versioning:      'production_mlops',
}

// Fallback used when recommendModule comes from the AI as a display name
export const MODULE_NAME_TO_SLUG: Record<string, string> = {
  'RAG System Design':          'rag_system_design',
  'Agentic Systems':            'agent_orchestration',
  'Agent Orchestration':        'agent_orchestration',
  'Evaluation & Observability': 'evaluation_testing',
  'Evaluation & Testing':       'evaluation_testing',
  'Cost, Latency & Safety':     'production_mlops',
  'Production / MLOps':         'production_mlops',
}
