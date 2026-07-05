// Config-driven mapping from CV diagnostic signal keys → interview modules.
// Add new signal keys here without touching any routing or UI logic.
export interface ModuleTarget {
  slug: string      // matches MODULES[].id on the start page
  name: string      // display name
  emoji: string
  free: boolean     // whether this module is on the free tier
}

export const GAP_TO_MODULE: Record<string, ModuleTarget> = {
  rag:        { slug: 'rag_system_design',   name: 'RAG System Design',    emoji: '🔍', free: true  },
  agentic:    { slug: 'agent_orchestration', name: 'Agent Orchestration',  emoji: '🕵️', free: false },
  eval:       { slug: 'evaluation_testing',  name: 'Evaluation & Testing', emoji: '🧪', free: false },
  production: { slug: 'production_mlops',    name: 'Production / MLOps',   emoji: '⚙️', free: false },
  cost:       { slug: 'production_mlops',    name: 'Production / MLOps',   emoji: '⚙️', free: false },
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
