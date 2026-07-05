-- Migration 005: Full app schema — role_tracks, skill_modules, sub_skills, questions,
-- session_turns, diagnostic_reports, feedback_flags, cvs, cv_reports
-- Also patches interview_sessions with missing columns.
-- Run in Supabase Dashboard → SQL Editor → Run

-- ─── Role tracks ─────────────────────────────────────────────────────────────
create table if not exists public.role_tracks (
  id         uuid primary key default uuid_generate_v4(),
  slug       text not null unique,
  name_en    text not null,
  name_fr    text not null,
  created_at timestamptz default now()
);

alter table public.role_tracks enable row level security;
create policy "role_tracks read" on public.role_tracks for select using (true);

insert into public.role_tracks (slug, name_en, name_fr)
values ('applied_ai_engineer', 'Applied AI Engineer', 'Ingénieur IA Appliqué')
on conflict (slug) do nothing;

-- ─── Skill modules ────────────────────────────────────────────────────────────
create table if not exists public.skill_modules (
  id             uuid primary key default uuid_generate_v4(),
  role_track_id  uuid not null references public.role_tracks(id) on delete cascade,
  slug           text not null unique,
  name_en        text not null,
  name_fr        text not null,
  is_active      boolean not null default true,
  display_order  int not null default 0,
  created_at     timestamptz default now()
);

alter table public.skill_modules enable row level security;
create policy "skill_modules read" on public.skill_modules for select using (true);

insert into public.skill_modules (role_track_id, slug, name_en, name_fr, display_order)
select
  rt.id,
  m.slug,
  m.name_en,
  m.name_fr,
  m.ord
from public.role_tracks rt
cross join (values
  ('rag_system_design',   'RAG System Design',   'Conception de systèmes RAG',    1),
  ('agent_orchestration', 'Agent Orchestration',  'Orchestration d''agents',        2),
  ('evaluation_testing',  'Evaluation & Testing', 'Évaluation & Tests',             3),
  ('production_mlops',    'Production / MLOps',   'Production / MLOps',             4)
) as m(slug, name_en, name_fr, ord)
where rt.slug = 'applied_ai_engineer'
on conflict (slug) do nothing;

-- ─── Sub-skills ───────────────────────────────────────────────────────────────
create table if not exists public.sub_skills (
  id              uuid primary key default uuid_generate_v4(),
  skill_module_id uuid not null references public.skill_modules(id) on delete cascade,
  slug            text not null,
  name_en         text not null,
  name_fr         text not null,
  display_order   int not null default 0,
  created_at      timestamptz default now(),
  unique (skill_module_id, slug)
);

alter table public.sub_skills enable row level security;
create policy "sub_skills read" on public.sub_skills for select using (true);

insert into public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
select sm.id, ss.slug, ss.name_en, ss.name_fr, ss.ord
from public.skill_modules sm
join (values
  -- RAG System Design
  ('rag_system_design', 'chunking',         'Chunking Strategies',            'Stratégies de découpage',         1),
  ('rag_system_design', 'retrieval_quality','Retrieval Quality',               'Qualité de la récupération',      2),
  ('rag_system_design', 'reranking',        'Reranking',                       'Reclassification',                3),
  ('rag_system_design', 'index_freshness',  'Index Freshness',                 'Fraîcheur de l''index',           4),
  -- Agent Orchestration
  ('agent_orchestration','tool_use',         'Tool Use & Function Calling',    'Utilisation d''outils',           1),
  ('agent_orchestration','planning',         'Planning & Reasoning',            'Planification et raisonnement',   2),
  ('agent_orchestration','failure_handling', 'Failure Handling',                'Gestion des erreurs',             3),
  ('agent_orchestration','multi_agent',      'Multi-Agent Coordination',        'Coordination multi-agents',       4),
  -- Evaluation & Testing
  ('evaluation_testing', 'eval_design',      'Eval Design & Metrics',          'Conception des évals',            1),
  ('evaluation_testing', 'hallucination',    'Hallucination Detection',         'Détection des hallucinations',    2),
  ('evaluation_testing', 'offline_online',   'Offline vs Online Evaluation',    'Évaluation offline vs online',    3),
  ('evaluation_testing', 'regression',       'Regression Testing',              'Tests de régression',             4),
  -- Production / MLOps
  ('production_mlops',   'monitoring',       'Monitoring & Observability',      'Monitoring et observabilité',     1),
  ('production_mlops',   'cost_latency',     'Cost & Latency Optimization',     'Optimisation coût et latence',    2),
  ('production_mlops',   'versioning',       'Model Versioning',                'Versionnage des modèles',         3),
  ('production_mlops',   'deployment',       'Deployment Strategies',           'Stratégies de déploiement',      4)
) as ss(module_slug, slug, name_en, name_fr, ord) on sm.slug = ss.module_slug
on conflict (skill_module_id, slug) do nothing;

-- ─── Questions ────────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id                uuid primary key default uuid_generate_v4(),
  sub_skill_id      uuid not null references public.sub_skills(id) on delete cascade,
  body_en           text not null,
  body_fr           text not null,
  rubric_strong     text not null,
  rubric_medium     text not null,
  rubric_weak       text not null,
  follow_up_probes  text[] not null default '{}',
  display_order     int not null default 0,
  created_at        timestamptz default now()
);

alter table public.questions enable row level security;
create policy "questions read" on public.questions for select using (true);

-- Seed questions (one per sub-skill)
-- RAG: chunking
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'Walk me through how you would choose a chunking strategy for a production RAG system. What factors matter most?',
  'Expliquez comment vous choisiriez une stratégie de découpage pour un système RAG en production. Quels facteurs sont les plus importants ?',
  'Discusses trade-offs between fixed-size, semantic, and hierarchical chunking. Mentions chunk overlap, token budget constraints, and how document structure (headers, tables, code blocks) should influence the strategy. References testing approach (retrieval precision/recall on a golden set) to validate the chosen strategy.',
  'Names multiple chunking strategies and picks one with a reason, but doesn''t address testing or document-type variation. Overlooks boundary effects.',
  'Describes only fixed-size chunking or just "splitting by paragraphs" with no mention of trade-offs, overlap, or evaluation.',
  array[
    'How would your strategy change if the corpus contains both long technical PDFs and short FAQ entries?',
    'How do you decide on chunk overlap size, and what problem does it solve?',
    'How would you measure whether your chunking choice is actually improving retrieval quality?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'rag_system_design' and ss.slug = 'chunking'
on conflict do nothing;

-- RAG: retrieval_quality
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'In a RAG system where users are getting irrelevant retrieved chunks, what would be your debugging and improvement process?',
  'Dans un système RAG où les utilisateurs obtiennent des chunks non pertinents, quel serait votre processus de débogage et d''amélioration ?',
  'Systematically diagnoses: query-document embedding mismatch (domain shift), poor similarity metric, top-k too small or too large. Mentions evaluating retrieval with NDCG/MRR on a labeled set, testing hybrid search (BM25 + dense), adjusting embedding model, and query expansion or HyDE as remediation.',
  'Identifies a few causes (bad embeddings, wrong top-k) and mentions hybrid search, but doesn''t have a structured evaluation methodology.',
  'Suggests "try a better embedding model" or "increase top-k" without any diagnostic framework.',
  array[
    'If the embedding model seems fine but results are still off, what would you investigate next?',
    'When would you choose hybrid search over dense-only retrieval?',
    'How do you build a labeled evaluation set when you have no ground-truth query-document pairs?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'rag_system_design' and ss.slug = 'retrieval_quality'
on conflict do nothing;

-- RAG: reranking
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'Explain how you would add reranking to a RAG pipeline and when you would justify the added latency.',
  'Expliquez comment vous ajouteriez un reclassificateur à un pipeline RAG et quand vous justifieriez la latence supplémentaire.',
  'Explains the two-stage retrieve-then-rerank pattern. Distinguishes cross-encoder (slow, accurate) from bi-encoder (fast) rerankers. Discusses latency budget vs precision gain trade-off. Mentions cohere-rerank, BGE-reranker, or training a custom reranker on click data. Mentions cascade thresholds and async reranking.',
  'Knows that reranking improves precision and names a cross-encoder, but doesn''t address latency mitigation or when to skip reranking.',
  'Describes reranking as "just sorting results by score" without understanding the cross-encoder vs bi-encoder distinction.',
  array[
    'How do you decide how many candidates to pass to the reranker?',
    'When would a cross-encoder reranker be too slow for your use case, and how would you work around that?',
    'Have you ever trained or fine-tuned a reranker? How would you generate training data?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'rag_system_design' and ss.slug = 'reranking'
on conflict do nothing;

-- RAG: index_freshness
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'Your RAG system''s document corpus is updated daily. How do you ensure the vector index stays fresh without degrading retrieval quality?',
  'Le corpus de documents de votre système RAG est mis à jour quotidiennement. Comment assurez-vous que l''index vectoriel reste à jour sans dégrader la qualité de récupération ?',
  'Addresses incremental vs full re-indexing trade-offs. Discusses soft delete vs hard delete for removed documents. Mentions versioned indexes to enable zero-downtime swaps, CDC (change data capture) or webhook triggers. Covers staleness tolerance and how to monitor index drift.',
  'Mentions incremental upserts and periodic full rebuild, but doesn''t address soft deletes or zero-downtime deployment of new indexes.',
  'Suggests "rebuild the index every night" without any consideration of downtime, cost, or handling deletions.',
  array[
    'How do you handle documents that have been deleted from the source — what happens to their vectors?',
    'If a full rebuild takes 4 hours, how do you serve queries during that window?',
    'How do you detect when index staleness is actually hurting users?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'rag_system_design' and ss.slug = 'index_freshness'
on conflict do nothing;

-- Agent: tool_use
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'You''re designing an agent that needs to call external APIs. Walk me through how you structure tool definitions and handle tool errors.',
  'Vous concevez un agent qui doit appeler des API externes. Expliquez comment vous structurez les définitions d''outils et gérez les erreurs.',
  'Covers precise tool schema design (tight JSON schema, no over-permissive any-types), idempotent vs non-idempotent tool classification, retry policies, error messages designed to be LLM-readable, and fallback tools. Mentions tool-calling confirmation for destructive actions.',
  'Designs reasonable tool schemas and mentions retries, but doesn''t distinguish idempotent from non-idempotent tools or discuss LLM-readable error formats.',
  'Describes tools as "just functions" without addressing schema precision, error handling, or safety for destructive actions.',
  array[
    'How do you write tool error messages so the LLM can reason about what went wrong and recover?',
    'When would you require the agent to confirm with a human before executing a tool call?',
    'How do you prevent an agent from calling a non-idempotent tool multiple times on retries?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'tool_use'
on conflict do nothing;

-- Agent: planning
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'Compare ReAct, plan-and-execute, and reflection-based agent architectures. When would you choose each?',
  'Comparez les architectures d''agents ReAct, plan-and-execute et basées sur la réflexion. Quand choisiriez-vous chacune ?',
  'Accurately describes ReAct (interleaved reasoning+action), plan-and-execute (upfront plan then execution), and reflection (self-critique loops). Gives concrete task types where each excels: ReAct for exploratory tasks, plan-and-execute for structured workflows, reflection for quality-sensitive generation. Discusses latency and token cost implications.',
  'Knows ReAct and plan-and-execute and picks a use case for each, but misses reflection-based approaches or token cost implications.',
  'Describes ReAct as "thinking before acting" without technical accuracy, and can''t differentiate from plan-and-execute.',
  array[
    'What failure modes does ReAct have that plan-and-execute solves?',
    'How many reflection iterations is too many, and how do you decide when to stop?',
    'Have you ever combined multiple architectures in one agent? What problem did that solve?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'planning'
on conflict do nothing;

-- Agent: failure_handling
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'An agent in production enters an infinite loop calling the same tool repeatedly. How do you detect and prevent this class of failure?',
  'Un agent en production entre dans une boucle infinie appelant le même outil de façon répétée. Comment détectez-vous et prévenez-vous ce type de défaillance ?',
  'Covers multiple safeguards: step/turn budget, repeated-action detection (hashing tool call signatures), circuit breakers on tools, human-in-the-loop checkpoints, and structured logging to detect cycles post-hoc. Discusses graceful degradation vs hard stop.',
  'Mentions a max-steps limit and logging, but doesn''t address repeated-action detection or circuit breakers.',
  'Says "add a retry limit" without understanding that the problem is a logical loop, not a failure loop.',
  array[
    'How would you detect a semantic loop where the agent rephrases the same query slightly differently each time?',
    'What would a circuit breaker look like for an agent tool — what triggers it and what does the agent see?',
    'How do you balance giving the agent enough steps to complete complex tasks vs preventing runaway loops?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'failure_handling'
on conflict do nothing;

-- Agent: multi_agent
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'Walk me through a multi-agent system you would design for a complex research task. How do agents coordinate and share state?',
  'Décrivez un système multi-agents que vous concevriez pour une tâche de recherche complexe. Comment les agents coordonnent-ils et partagent-ils l''état ?',
  'Proposes clear agent roles (orchestrator, researcher, critic, writer). Addresses shared state options: message-passing vs shared memory vs external state store. Discusses trust boundaries between agents (can one agent call another''s tools?), partial failure handling, and observability of the multi-agent graph.',
  'Describes agent roles and mentions shared memory, but doesn''t address trust boundaries, partial failures, or observability.',
  'Describes multiple agents as "each doing a part of the task" without any coordination mechanism or shared state design.',
  array[
    'If the researcher agent returns something incorrect, how does the critic agent get involved?',
    'How do you handle a scenario where one agent in the pipeline is significantly slower than the others?',
    'What are the security implications of letting one agent call another agent''s tools?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'multi_agent'
on conflict do nothing;

-- Eval: eval_design
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'You''re building an eval suite for a customer-support LLM. What metrics would you use and how would you structure the evaluation?',
  'Vous construisez une suite d''évaluation pour un LLM de support client. Quelles métriques utiliseriez-vous et comment structureriez-vous l''évaluation ?',
  'Covers task-specific metrics (resolution rate, escalation rate, CSAT correlation), LLM-as-judge for quality dimensions (accuracy, tone, policy compliance), golden-set with human labels, and A/B testing in shadow mode. Discusses metric gaming and why single-number evals are dangerous.',
  'Names relevant metrics (accuracy, BLEU, LLM-judge) and mentions a golden set, but doesn''t address metric gaming or production A/B validation.',
  'Says "use BLEU score" or "measure accuracy" without understanding why reference-based metrics are inappropriate for open-ended support responses.',
  array[
    'How do you build a golden set when support queries are highly diverse and labels are expensive?',
    'How do you prevent the model team from over-fitting to your eval metrics?',
    'What''s the lag between an eval improvement and seeing it in production CSAT?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'evaluation_testing' and ss.slug = 'eval_design'
on conflict do nothing;

-- Eval: hallucination
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'How do you systematically detect and reduce hallucinations in a RAG-based system?',
  'Comment détectez-vous et réduisez-vous systématiquement les hallucinations dans un système basé sur RAG ?',
  'Distinguishes faithfulness (grounded in retrieved context) from factual correctness (true in the world). Describes faithfulness scoring (NLI-based, LLM-as-judge), source attribution checks, citation grounding. Discusses prompt mitigations (explicit "only use provided context" instructions) and retrieval improvements to reduce hallucination root causes.',
  'Mentions faithfulness vs factual accuracy and LLM-judge, but conflates the two or doesn''t discuss retrieval-side root causes.',
  'Says "add a fact-checker" without specifying what it checks against or how it''s implemented.',
  array[
    'How do you measure hallucination rate at scale without human annotation for every response?',
    'When a model hallucinates despite having the correct document in context, what is the likely cause?',
    'How do you handle the case where the retrieved documents themselves contain incorrect information?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'evaluation_testing' and ss.slug = 'hallucination'
on conflict do nothing;

-- Eval: offline_online
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'What is the relationship between offline eval performance and online production performance, and how do you manage the gap?',
  'Quelle est la relation entre les performances d''évaluation offline et les performances en production, et comment gérez-vous l''écart ?',
  'Explains that offline evals measure proxy metrics on historical/synthetic data while online metrics measure real user outcomes. Identifies distribution shift (eval data ≠ prod traffic), Goodhart''s law (optimizing for eval metric != real quality), and novelty effects. Recommends shadow scoring, canary deployments, and using production logs to expand the eval set.',
  'Knows offline evals can differ from production and mentions A/B testing, but doesn''t articulate distribution shift or Goodhart''s law systematically.',
  'Assumes offline eval performance directly predicts production performance without qualification.',
  array[
    'Give me an example where offline eval improved but production quality degraded.',
    'How do you use production traffic logs to continuously update your offline eval set?',
    'How do you decide when an offline eval improvement is large enough to justify a production deployment?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'evaluation_testing' and ss.slug = 'offline_online'
on conflict do nothing;

-- Eval: regression
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'You''re about to upgrade the LLM in a production pipeline. How do you ensure the upgrade doesn''t introduce regressions?',
  'Vous allez mettre à jour le LLM dans un pipeline de production. Comment vous assurez-vous que la mise à jour n''introduit pas de régressions ?',
  'Describes a structured rollout: side-by-side comparison on the full eval suite, specific regression tests for known failure modes, traffic shadowing (run both models on prod traffic, compare outputs), canary at 5% traffic with rollback trigger, and post-deployment monitoring for leading indicators.',
  'Mentions running evals and canary deployment, but doesn''t describe side-by-side comparison methodology or specific rollback triggers.',
  'Says "test the new model on a few examples" without a systematic comparison or rollback plan.',
  array[
    'How do you design regression tests for failure modes that are hard to quantify, like tone or helpfulness?',
    'What''s your rollback trigger — at what point do you pull back the new model?',
    'How do you handle cases where the new model is better on most queries but significantly worse on a small critical segment?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'evaluation_testing' and ss.slug = 'regression'
on conflict do nothing;

-- MLOps: monitoring
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'What does a production monitoring stack for an LLM-powered feature look like? What signals would you alert on?',
  'À quoi ressemble une stack de monitoring de production pour une fonctionnalité LLM ? Sur quels signaux alerteriez-vous ?',
  'Covers latency percentiles (p50/p95/p99) and error rates at the infra level, plus LLM-specific signals: output token distribution, refusal rate, user feedback signals, LLM-as-judge quality score sampling. Discusses alert thresholds, on-call runbooks, and distinguishing model degradation from infra degradation.',
  'Mentions latency, error rate, and user feedback, but doesn''t cover LLM-specific signals like refusal rate or quality score sampling.',
  'Describes standard web service monitoring (uptime, latency) without any LLM-specific considerations.',
  array[
    'How do you monitor for slow model drift that doesn''t trigger threshold-based alerts?',
    'When you get paged at 2am for LLM quality degradation, what''s your first diagnostic step?',
    'How do you set quality alert thresholds when you can''t evaluate every output automatically?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'monitoring'
on conflict do nothing;

-- MLOps: cost_latency
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'Your LLM feature is costing 10x more than budgeted. Walk me through how you would diagnose and reduce costs without sacrificing quality.',
  'Votre fonctionnalité LLM coûte 10 fois plus que prévu. Comment diagnostiqueriez-vous et réduiriez-vous les coûts sans sacrifier la qualité ?',
  'Diagnoses cost drivers systematically: input tokens (long system prompts, over-fetched context), output tokens (verbose generation), model tier (using GPT-4 where GPT-3.5 suffices). Proposes prompt compression, context caching, model routing (fast/cheap for simple queries, powerful for complex), output length caps, and batching.',
  'Identifies a few cost levers (shorter prompts, cheaper model for simple queries) but doesn''t systematically diagnose or mention caching.',
  'Says "use a cheaper model" as the only option, without diagnostic framework or quality trade-off consideration.',
  array[
    'How would you implement a model router that sends easy queries to a cheap model and hard ones to a powerful model?',
    'What are the quality risks of prompt compression, and how do you validate them?',
    'How does prompt caching work and when does it save significant money?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'cost_latency'
on conflict do nothing;

-- MLOps: versioning
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'How do you version and manage changes to prompts, fine-tuned models, and retrieval indexes in a production system?',
  'Comment versionnez-vous et gérez-vous les changements de prompts, de modèles fine-tunés et d''index de récupération en production ?',
  'Treats prompts, models, and indexes as first-class versioned artifacts. Discusses prompt versioning in code/config with semantic versioning or hash-based IDs, linking evaluation results to prompt versions, model registry with lineage, and coordinated rollouts when prompt + model + index must change together.',
  'Mentions putting prompts in config files and using a model registry, but doesn''t address coordinated rollouts or linking eval results to versions.',
  'Says "we track changes in git" without addressing the coupling between prompt, model, and retrieval index versions.',
  array[
    'What happens when a prompt version change requires a simultaneous index rebuild — how do you deploy that?',
    'How do you decide when to roll back a prompt version vs fix-forward?',
    'How do you reproduce a production incident 6 months later if you don''t know which prompt version was running?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'versioning'
on conflict do nothing;

-- MLOps: deployment
insert into public.questions (sub_skill_id, body_en, body_fr, rubric_strong, rubric_medium, rubric_weak, follow_up_probes, display_order)
select ss.id,
  'You''re deploying a fine-tuned model to production for the first time. Walk me through your deployment strategy.',
  'Vous déployez un modèle fine-tuné en production pour la première fois. Décrivez votre stratégie de déploiement.',
  'Covers the full lifecycle: shadow mode (prod traffic, no effect), canary (% traffic with automated rollback trigger), blue-green or feature-flagged deployment, latency and quality monitoring during rollout, and the criteria for full cutover. Discusses serving infrastructure choices (managed API vs self-hosted) and the latency/cost/control trade-off.',
  'Describes shadow mode and canary deployment with rollback, but doesn''t address serving infrastructure choice or automated rollback triggers.',
  'Describes "testing it on some users first" without a structured canary or rollback strategy.',
  array[
    'What automated rollback trigger would you set for a canary deployment of a fine-tuned model?',
    'When would you choose to self-host a fine-tuned model vs use a managed fine-tuning API?',
    'How long do you run shadow mode before starting the canary, and what metrics drive that decision?'
  ],
  1
from public.sub_skills ss join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'deployment'
on conflict do nothing;

-- ─── Patch interview_sessions with new columns ────────────────────────────────
alter table public.interview_sessions
  add column if not exists skill_module_id      uuid references public.skill_modules(id),
  add column if not exists role_track_id        uuid references public.role_tracks(id),
  add column if not exists language             text not null default 'en',
  add column if not exists modality             text not null default 'text',
  add column if not exists session_type         text not null default 'full',
  add column if not exists max_sub_skills       integer not null default 4,
  add column if not exists current_sub_skill_idx integer not null default 0,
  add column if not exists sub_skills_covered   text[] not null default '{}',
  add column if not exists turn_count           integer not null default 0;

-- ─── Session turns ────────────────────────────────────────────────────────────
create table if not exists public.session_turns (
  id               uuid primary key default uuid_generate_v4(),
  session_id       uuid not null references public.interview_sessions(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  turn_number      int not null default 0,
  question_id      uuid references public.questions(id),
  sub_skill_id     uuid references public.sub_skills(id),
  question_text    text not null default '',
  answer_text      text not null default '',
  grade_score      numeric(3,1),
  grade_evidence   text,
  grade_rationale  text,
  grade_gaps       text[],
  grade_strengths  text[],
  follow_up_used   boolean,
  created_at       timestamptz default now()
);

alter table public.session_turns enable row level security;
create policy "own turns" on public.session_turns for all using (auth.uid() = user_id);
create index if not exists idx_turns_session on public.session_turns(session_id, turn_number asc);

-- ─── Diagnostic reports ───────────────────────────────────────────────────────
create table if not exists public.diagnostic_reports (
  id                uuid primary key default uuid_generate_v4(),
  session_id        uuid not null references public.interview_sessions(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  overall_score     numeric(3,1),
  top_strength      text,
  top_gap           text,
  headline_en       text,
  headline_fr       text,
  sub_skill_scores  jsonb,
  improvement_plan  jsonb,
  full_summary_en   text,
  full_summary_fr   text,
  share_token       text unique default encode(gen_random_bytes(12), 'hex'),
  created_at        timestamptz default now()
);

alter table public.diagnostic_reports enable row level security;
create policy "own reports"    on public.diagnostic_reports for select using (auth.uid() = user_id);
create policy "shared reports" on public.diagnostic_reports for select using (share_token is not null);
create index if not exists idx_reports_session on public.diagnostic_reports(session_id);
create index if not exists idx_reports_user    on public.diagnostic_reports(user_id, created_at desc);

-- ─── Feedback flags ───────────────────────────────────────────────────────────
create table if not exists public.feedback_flags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.interview_sessions(id) on delete cascade,
  target_type text not null check (target_type in ('question','diagnosis','turn')),
  target_id   text not null,
  note        text,
  created_at  timestamptz default now()
);

alter table public.feedback_flags enable row level security;
create policy "own flags" on public.feedback_flags for all using (auth.uid() = user_id);

-- ─── CVs (one per user) ───────────────────────────────────────────────────────
create table if not exists public.cvs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  text       text not null,
  updated_at timestamptz default now()
);

alter table public.cvs enable row level security;
create policy "own cv" on public.cvs for all using (auth.uid() = user_id);

-- ─── CV reports ───────────────────────────────────────────────────────────────
create table if not exists public.cv_reports (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  overall          numeric(3,1),
  signals          jsonb,
  strengths        text[],
  gap              text,
  flags            text[],
  recommend_module text,
  recommend_why    text,
  created_at       timestamptz default now()
);

alter table public.cv_reports enable row level security;
create policy "own cv reports" on public.cv_reports for all using (auth.uid() = user_id);
create index if not exists idx_cv_reports_user on public.cv_reports(user_id, created_at desc);
