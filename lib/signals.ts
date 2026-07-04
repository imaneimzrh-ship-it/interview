export interface Signal {
  key: 'production' | 'rag' | 'agentic' | 'eval' | 'cost'
  label_en: string
  label_fr: string
  desc_en: string
  desc_fr: string
  weight: number
}

export const SIGNALS: Signal[] = [
  {
    key: 'production',
    label_en: 'Production Evidence',
    label_fr: 'Expérience en production',
    desc_en: 'Shipped systems serving real users with metrics — not demos, notebooks, or courses',
    desc_fr: 'Systèmes déployés servant de vrais utilisateurs avec des métriques — pas de démos, notebooks ou cours',
    weight: 30,
  },
  {
    key: 'rag',
    label_en: 'RAG Depth',
    label_fr: 'Profondeur RAG',
    desc_en: 'Hybrid retrieval, reranking, retrieval evaluation — not just basic semantic search',
    desc_fr: 'Recherche hybride, reranking, évaluation de la récupération — pas seulement la recherche sémantique de base',
    weight: 20,
  },
  {
    key: 'agentic',
    label_en: 'Agentic Experience',
    label_fr: 'Expérience agentique',
    desc_en: 'Planners, tool use, memory, multi-agent failure modes — not just calling an API',
    desc_fr: "Planificateurs, utilisation d'outils, mémoire, modes d'échec multi-agents — pas seulement appeler une API",
    weight: 20,
  },
  {
    key: 'eval',
    label_en: 'Evaluation Literacy',
    label_fr: 'Maîtrise de l\'évaluation',
    desc_en: 'Golden sets, LLM-as-judge validated against human labels, regression gates — the strongest hiring signal',
    desc_fr: "Ensembles de référence, LLM-as-judge validé par des étiquettes humaines, barrières de régression — le signal d'embauche le plus fort",
    weight: 20,
  },
  {
    key: 'cost',
    label_en: 'Cost & Safety',
    label_fr: 'Coût et sécurité',
    desc_en: 'Token budgets, model routing, caching, guardrails, prompt injection awareness',
    desc_fr: "Budgets de tokens, routage de modèles, mise en cache, garde-fous, sensibilisation à l'injection de prompt",
    weight: 10,
  },
]

export type Band = 'Strong' | 'Developing' | 'Gap'

export function scoreToBand(score: number): Band {
  if (score >= 70) return 'Strong'
  if (score >= 45) return 'Developing'
  return 'Gap'
}

export const BAND_COLORS: Record<Band, { bg: string; text: string; border: string }> = {
  Strong:     { bg: '#F0FDF4', text: '#2E7D5B', border: '#BBF7D0' },
  Developing: { bg: '#FFFBEB', text: '#C77D2E', border: '#FDE68A' },
  Gap:        { bg: '#FEF2F2', text: '#B24C3F', border: '#FECACA' },
}
