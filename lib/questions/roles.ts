// ALL AI ROLES — based on live job market research July 2026
// Sources: jobs.ch (1,228 listings), LinkedIn, Glassdoor CH, datacareer.ch

export interface Role {
  id: string
  label: string
  category: 'engineering' | 'data' | 'automation' | 'product' | 'vertical'
  isPro: boolean       // requires Pro subscription
  emoji: string
  description: string  // what interviewers test in this role
  salaryRange?: string
  demandLevel: 'extreme' | 'high' | 'growing' | 'emerging'
}

export const ALL_ROLES: Role[] = [
  // ─── Engineering (Pro) ──────────────────────────────────────────────────────
  { id: 'ai_engineer',          label: 'AI Engineer',              category: 'engineering', isPro: true,  emoji: '🤖', description: 'RAG systems, agent design, LLM fundamentals, production AI', salaryRange: 'CHF 120–180K', demandLevel: 'extreme' },
  { id: 'ml_engineer',          label: 'ML Engineer',              category: 'engineering', isPro: true,  emoji: '🧠', description: 'Model training, evaluation, MLOps, fine-tuning, deployment', salaryRange: 'CHF 130–190K', demandLevel: 'extreme' },
  { id: 'llm_engineer',         label: 'LLM Engineer',             category: 'engineering', isPro: true,  emoji: '⚡', description: 'Prompt engineering, context management, LLM APIs, cost optimisation', salaryRange: 'CHF 120–170K', demandLevel: 'extreme' },
  { id: 'ai_agent_developer',   label: 'AI Agent Developer',       category: 'engineering', isPro: true,  emoji: '🕵️', description: 'Multi-agent systems, tool calling, agent failure modes, orchestration', salaryRange: 'CHF 110–160K', demandLevel: 'extreme' },
  { id: 'generative_ai_dev',    label: 'Generative AI Developer',  category: 'engineering', isPro: true,  emoji: '✨', description: 'GenAI APIs, image/text/audio generation, multimodal systems', salaryRange: 'CHF 110–160K', demandLevel: 'high' },
  { id: 'mlops_engineer',       label: 'MLOps Engineer',           category: 'engineering', isPro: true,  emoji: '🔧', description: 'Model serving, monitoring, CI/CD for ML, infrastructure', salaryRange: 'CHF 120–170K', demandLevel: 'high' },
  { id: 'ai_safety_engineer',   label: 'AI Safety Engineer',       category: 'engineering', isPro: true,  emoji: '🛡️', description: 'RLHF, alignment, red-teaming, safety evaluation, guardrails', salaryRange: 'CHF 150–220K', demandLevel: 'growing' },
  { id: 'ai_infrastructure',    label: 'AI Infrastructure Engineer', category: 'engineering', isPro: true, emoji: '🏗️', description: 'GPU clusters, inference optimisation, distributed training, CUDA', salaryRange: 'CHF 130–200K', demandLevel: 'high' },
  { id: 'forward_deployed',     label: 'Forward Deployed Engineer', category: 'engineering', isPro: true, emoji: '🚀', description: 'Onsite customer integration, solutions engineering, AI deployment', salaryRange: 'CHF 120–180K', demandLevel: 'growing' },
  { id: 'computer_vision',      label: 'Computer Vision Engineer', category: 'engineering', isPro: true,  emoji: '👁️', description: 'Image/video models, object detection, foundation vision models', salaryRange: 'CHF 120–175K', demandLevel: 'high' },
  { id: 'nlp_engineer',         label: 'NLP Engineer',             category: 'engineering', isPro: true,  emoji: '💬', description: 'Text classification, NER, sentiment, language models', salaryRange: 'CHF 110–165K', demandLevel: 'high' },
  { id: 'ai_native_engineer',   label: 'AI-Native Engineer',       category: 'engineering', isPro: true,  emoji: '🌐', description: 'Building products where AI is the core — agents, copilots, RAG apps', salaryRange: 'CHF 120–180K', demandLevel: 'extreme' },
  { id: 'ai_researcher',        label: 'AI Researcher',            category: 'engineering', isPro: true,  emoji: '🔬', description: 'Research papers, model architecture, novel algorithms, lab interviews', salaryRange: 'CHF 140–250K', demandLevel: 'high' },
  { id: 'prompt_engineer',      label: 'Prompt Engineer',          category: 'engineering', isPro: true,  emoji: '📝', description: 'Prompt design, chain-of-thought, evaluation, prompt optimisation', salaryRange: 'CHF 90–140K', demandLevel: 'high' },

  // ─── Data & Analytics (Pro) ─────────────────────────────────────────────────
  { id: 'data_scientist_ai',    label: 'Data Scientist (AI)',      category: 'data', isPro: true,  emoji: '📊', description: 'ML modelling, A/B testing, statistical analysis, AI experimentation', salaryRange: 'CHF 110–165K', demandLevel: 'high' },
  { id: 'ai_data_engineer',     label: 'AI Data Engineer',         category: 'data', isPro: true,  emoji: '🗄️', description: 'Data pipelines for AI, feature stores, labelling infrastructure', salaryRange: 'CHF 110–160K', demandLevel: 'high' },
  { id: 'rlhf_specialist',      label: 'RLHF Specialist',          category: 'data', isPro: true,  emoji: '🎯', description: 'Human feedback collection, reward modelling, DPO, preference data', salaryRange: 'CHF 90–140K', demandLevel: 'growing' },
  { id: 'ai_evaluator',         label: 'AI Evaluator / Red Teamer', category: 'data', isPro: true, emoji: '🔴', description: 'Model evaluation, adversarial testing, benchmark design, safety testing', salaryRange: 'CHF 90–140K', demandLevel: 'growing' },
  { id: 'data_annotation',      label: 'Data Annotation Lead',     category: 'data', isPro: false, emoji: '🏷️', description: 'Managing annotation pipelines, quality control, labelling tools', salaryRange: 'CHF 70–100K', demandLevel: 'high' },

  // ─── Automation (mix of free/Pro) ───────────────────────────────────────────
  { id: 'ai_automation',        label: 'AI Automation Engineer',   category: 'automation', isPro: true,  emoji: '⚙️', description: 'n8n, Make.com, Zapier + AI. Workflow automation with LLM integration', salaryRange: 'CHF 90–140K', demandLevel: 'extreme' },
  { id: 'n8n_developer',        label: 'n8n Developer',            category: 'automation', isPro: false, emoji: '🔗', description: 'Building automation workflows in n8n, API integration, error handling', salaryRange: 'CHF 80–120K', demandLevel: 'extreme' },
  { id: 'ai_integration',       label: 'AI Integration Analyst',   category: 'automation', isPro: false, emoji: '🧩', description: 'Connecting AI tools to business processes, ROI analysis, adoption', salaryRange: 'CHF 80–120K', demandLevel: 'high' },
  { id: 'rpa_ai',               label: 'RPA + AI Engineer',        category: 'automation', isPro: false, emoji: '🤖', description: 'UiPath, Power Automate + AI augmentation. Process automation.', salaryRange: 'CHF 90–130K', demandLevel: 'high' },
  { id: 'chatgpt_developer',    label: 'ChatGPT / Claude Developer', category: 'automation', isPro: false, emoji: '💡', description: 'Building products on top of LLM APIs, prompt design, UX for AI', salaryRange: 'CHF 80–120K', demandLevel: 'growing' },

  // ─── Product & Strategy ─────────────────────────────────────────────────────
  { id: 'ai_product_manager',   label: 'AI Product Manager',       category: 'product', isPro: true,  emoji: '📋', description: 'AI feature definition, stakeholder alignment, tradeoffs with technical teams', salaryRange: 'CHF 120–180K', demandLevel: 'high' },
  { id: 'ai_solutions_architect', label: 'AI Solutions Architect', category: 'product', isPro: true,  emoji: '🏛️', description: 'Enterprise AI architecture, platform selection, cloud AI services', salaryRange: 'CHF 140–200K', demandLevel: 'high' },
  { id: 'ai_consultant',        label: 'AI Consultant',            category: 'product', isPro: false, emoji: '💼', description: 'AI strategy, use case identification, ROI analysis, change management', salaryRange: 'CHF 120–180K', demandLevel: 'high' },
  { id: 'ai_ethics',            label: 'AI Ethics & Governance',   category: 'product', isPro: false, emoji: '⚖️', description: 'Responsible AI, bias audit, EU AI Act compliance, governance frameworks', salaryRange: 'CHF 100–150K', demandLevel: 'growing' },

  // ─── General roles (always free) ────────────────────────────────────────────
  { id: 'software_engineer',    label: 'Software Engineer',        category: 'engineering', isPro: false, emoji: '💻', description: 'General SWE interviews — system design, coding, behavioral', demandLevel: 'high' },
  { id: 'product_manager',      label: 'Product Manager',          category: 'product',     isPro: false, emoji: '📱', description: 'Product sense, prioritisation, metrics, stakeholder management', demandLevel: 'high' },
  { id: 'data_scientist',       label: 'Data Scientist (general)', category: 'data',        isPro: false, emoji: '📈', description: 'Statistics, SQL, ML basics, experimentation, A/B testing', demandLevel: 'high' },
  { id: 'general',              label: 'General / Other role',     category: 'product',     isPro: false, emoji: '🎯', description: 'Behavioral questions, STAR framework, leadership principles', demandLevel: 'high' },
]

export const AI_ROLE_IDS = ALL_ROLES.filter(r => r.isPro).map(r => r.id)
export const FREE_ROLE_IDS = ALL_ROLES.filter(r => !r.isPro).map(r => r.id)

export const ROLES_BY_CATEGORY = {
  engineering: ALL_ROLES.filter(r => r.category === 'engineering' && r.isPro),
  data:        ALL_ROLES.filter(r => r.category === 'data' && r.isPro),
  automation:  ALL_ROLES.filter(r => r.category === 'automation'),
  product:     ALL_ROLES.filter(r => r.category === 'product'),
  free:        ALL_ROLES.filter(r => !r.isPro && r.category !== 'product'),
}

export const DEMAND_LABELS: Record<string, string> = {
  extreme:  '🔥 Extreme demand',
  high:     '📈 High demand',
  growing:  '⬆️ Growing fast',
  emerging: '🌱 Emerging',
}

export function getRoleById(id: string): Role | undefined {
  return ALL_ROLES.find(r => r.id === id)
}

export const COMPANY_LABELS: Record<string, string> = {
  none: 'Any company', anthropic: 'Anthropic', openai: 'OpenAI',
  google_deepmind: 'Google DeepMind', meta_ai: 'Meta AI',
  microsoft: 'Microsoft', amazon: 'Amazon AI', scale_ai: 'Scale AI',
  databricks: 'Databricks', nvidia: 'Nvidia', cohere: 'Cohere',
  perplexity: 'Perplexity', xai: 'xAI', mistral: 'Mistral',
  huggingface: 'Hugging Face', startup: 'AI Startup',
}
