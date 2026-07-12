-- Migration 007: Tools Glossary, Mock Panel, practical question modes 3 & 4

-- ─── Tools Glossary ──────────────────────────────────────────────────────────
create table if not exists public.tools_glossary (
  id                     uuid primary key default uuid_generate_v4(),
  name                   text not null unique,
  category               text not null check (category in ('orchestration','retrieval','serving','evaluation','fine_tuning','automation')),
  one_line_definition    text not null,
  common_interview_angle text not null,
  role_clusters          text[] not null default '{}',
  display_order          int default 0,
  created_at             timestamptz default now()
);

alter table public.tools_glossary enable row level security;
create policy "glossary read" on public.tools_glossary for select using (true);

insert into public.tools_glossary (name, category, one_line_definition, common_interview_angle, role_clusters, display_order) values
(
  'LangChain', 'orchestration',
  $$A framework for building LLM-powered applications by chaining together prompts, tools, memory, and retrieval components.$$,
  $$Interviewers probe whether you know when LangChain adds value vs when it adds unnecessary abstraction, and whether you can debug chain failures or replace it with direct API calls when performance matters.$$,
  array['ai_llm_engineer','ai_automation_engineer','fde'], 10
),
(
  'LangGraph', 'orchestration',
  $$A library built on LangChain for building stateful, multi-step agent graphs where nodes represent actions and edges represent conditional routing.$$,
  $$Interviewers ask you to model a real agent workflow as a graph, explain how you handle cycles without infinite loops, and debug a graph stuck in an unexpected state.$$,
  array['ai_llm_engineer','ai_automation_engineer'], 11
),
(
  'CrewAI', 'orchestration',
  $$A multi-agent orchestration framework that assigns roles to agents (Researcher, Writer, etc.) and coordinates tasks between them with shared context.$$,
  $$Interviewers probe whether multi-agent coordination is justified vs a single capable agent, and how you prevent agents from contradicting or duplicating each other.$$,
  array['ai_llm_engineer','ai_automation_engineer'], 12
),
(
  'MCP', 'orchestration',
  $$Model Context Protocol — an open protocol that standardizes how LLM applications connect to external tools, data sources, and prompts through a client-server model.$$,
  $$Interviewers ask when you would expose tools as an MCP server vs build a custom tool integration, and what security considerations apply when an external model host consumes your MCP server.$$,
  array['ai_llm_engineer','fde'], 13
),
(
  'LlamaIndex', 'retrieval',
  $$A data framework for building RAG pipelines that handles ingestion, indexing, querying, and retrieval from diverse data sources.$$,
  $$Interviewers probe when to use LlamaIndex vs building a raw retrieval pipeline, and how you tune index settings and retrieval parameters for production accuracy.$$,
  array['ai_llm_engineer','fde'], 20
),
(
  'Pinecone', 'retrieval',
  $$A managed vector database optimized for storing and querying high-dimensional embeddings at scale with low latency.$$,
  $$Interviewers ask about index configuration (pod vs serverless), metadata filtering trade-offs, and when you would choose Pinecone over pgvector or a self-hosted alternative.$$,
  array['ai_llm_engineer','fde'], 21
),
(
  'Weaviate', 'retrieval',
  $$An open-source vector database that supports hybrid search (vector plus keyword) and offers a built-in multi-tenancy model.$$,
  $$Interviewers probe your understanding of Weaviate distance metrics, the hybrid BM25 plus vector search combination, and how you set distance thresholds to avoid returning irrelevant results.$$,
  array['ai_llm_engineer'], 22
),
(
  'pgvector', 'retrieval',
  $$A PostgreSQL extension that adds a vector data type and approximate nearest-neighbor search, enabling similarity search inside an existing Postgres database.$$,
  $$Interviewers ask when pgvector is sufficient vs when you need a dedicated vector DB, and what the performance ceiling is before switching away from it.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 23
),
(
  'Qdrant', 'retrieval',
  $$An open-source vector database written in Rust, designed for high-throughput filtered vector search with fine-grained payload filtering.$$,
  $$Interviewers probe your knowledge of Qdrant payload indexing, sparse vectors for hybrid search, and its quantization options for reducing memory footprint at scale.$$,
  array['ai_llm_engineer'], 24
),
(
  'vLLM', 'serving',
  $$An open-source LLM inference engine that uses PagedAttention to maximize GPU memory utilization and throughput via continuous batching.$$,
  $$Interviewers ask you to explain PagedAttention and why it improves throughput over naive batching, the latency vs throughput trade-off of continuous batching, and when you would use vLLM vs a managed inference provider.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 30
),
(
  'TGI', 'serving',
  $$Text Generation Inference — Hugging Face production LLM serving framework with built-in quantization, tensor parallelism, and speculative decoding support.$$,
  $$Interviewers ask about TGI vs vLLM trade-offs, when to use speculative decoding, and how you configure tensor parallelism across multiple GPUs.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 31
),
(
  'Ollama', 'serving',
  $$A tool for running LLMs locally on a developer machine or edge device, with a simple REST API and support for quantized models.$$,
  $$Interviewers ask when Ollama is appropriate (local dev, privacy-sensitive workloads, edge inference) vs when you need a production serving stack, and its limitations around throughput and multi-user concurrency.$$,
  array['ai_llm_engineer'], 32
),
(
  'LangSmith', 'evaluation',
  $$A LangChain-native observability and evaluation platform for tracing LLM calls, comparing runs, and running automated evals on production traces.$$,
  $$Interviewers probe how you use LangSmith to detect regressions, how you define evaluation datasets, and when trace-level visibility caught a bug that aggregate metrics missed.$$,
  array['ai_llm_engineer','ai_automation_engineer'], 40
),
(
  'Arize', 'evaluation',
  $$An ML observability platform that monitors model and embedding quality in production, with drift detection and RAG-specific evaluation metrics.$$,
  $$Interviewers ask how you set up drift alerts, how Arize helps diagnose retrieval quality degradation, and the difference between using Arize for a classification model vs an LLM pipeline.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 41
),
(
  'Ragas', 'evaluation',
  $$An open-source framework for evaluating RAG pipelines using reference-free metrics such as faithfulness, answer relevancy, and context precision.$$,
  $$Interviewers ask what faithfulness measures vs answer relevancy, the limitations of LLM-as-judge metrics, and how you build a Ragas evaluation pipeline without ground-truth answers.$$,
  array['ai_llm_engineer'], 42
),
(
  'Braintrust', 'evaluation',
  $$An eval and prompt management platform for LLM applications that supports experiment tracking, dataset management, and CI integration for regression detection.$$,
  $$Interviewers probe how you integrate Braintrust into a CI pipeline to block deployments on eval regression, and how you manage prompt versioning across experiments.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 43
),
(
  'LoRA', 'fine_tuning',
  $$Low-Rank Adaptation — a parameter-efficient fine-tuning method that injects trainable low-rank matrices into transformer layers, drastically reducing the number of trainable parameters vs full fine-tuning.$$,
  $$Interviewers ask why low-rank decomposition works for fine-tuning, when LoRA is preferable to full fine-tuning, and how you choose rank and alpha hyperparameters.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 50
),
(
  'QLoRA', 'fine_tuning',
  $$Quantized LoRA — combines 4-bit quantization of the base model with LoRA adapters, enabling fine-tuning of large models on a single consumer GPU.$$,
  $$Interviewers probe the memory trade-off between QLoRA and LoRA, when 4-bit quantization introduces unacceptable quality loss, and whether you deploy the quantized model or dequantize before serving.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 51
),
(
  'PEFT', 'fine_tuning',
  $$Parameter-Efficient Fine-Tuning — a Hugging Face library providing a unified interface for LoRA, QLoRA, prefix tuning, and other adapter-based methods.$$,
  $$Interviewers ask you to compare LoRA vs prefix tuning vs adapter layers, and when you would use PEFT to add task-specific capability without full fine-tuning.$$,
  array['ai_llm_engineer','applied_ai_mlops'], 52
),
(
  'Zapier', 'automation',
  $$A no-code automation platform connecting 6000+ apps through event-triggered workflows (Zaps), with AI integration via natural-language action steps.$$,
  $$Interviewers probe the difference between Zapier and a code-based automation such as n8n or a custom agent, and when Zapier hits its limits and requires a more capable orchestration layer.$$,
  array['ai_automation_engineer','fde'], 60
),
(
  'n8n', 'automation',
  $$An open-source, self-hostable workflow automation tool with a visual node editor, supporting 400+ integrations and custom code nodes for when no-code is insufficient.$$,
  $$Interviewers ask how you make n8n workflows robust to failures (retry policies, error branches), how you handle rate limits from external APIs, and when n8n is preferable to building a custom agent.$$,
  array['ai_automation_engineer','fde'], 61
),
(
  'Retool AI', 'automation',
  $$An internal tool builder that adds AI-powered components (LLM text generation, vector search, AI assistants) directly into data workflows and dashboards.$$,
  $$Interviewers probe when you would choose Retool AI for an internal tool vs build a custom interface, and what the security model looks like for exposing LLM capabilities to internal teams.$$,
  array['ai_automation_engineer','fde'], 62
)
on conflict (name) do nothing;

-- ─── Mock Panels ─────────────────────────────────────────────────────────────
create table if not exists public.mock_panels (
  id                uuid primary key default uuid_generate_v4(),
  role_cluster      text not null,
  title             text not null,
  description       text,
  round_sequence    text[] not null,
  based_on_pattern  text,
  estimated_minutes int default 45,
  is_active         boolean default true,
  created_at        timestamptz default now()
);

alter table public.mock_panels enable row level security;
create policy "panels read" on public.mock_panels for select using (true);

insert into public.mock_panels (role_cluster, title, description, round_sequence, based_on_pattern, estimated_minutes) values
(
  'ai_llm_engineer',
  'AI / LLM Engineer Full Loop',
  '4-round simulation covering the full reported interview loop for AI and LLM engineering roles.',
  array['screen','technical','system_design','behavioral'],
  'Modeled on commonly reported AI/LLM Engineer interview loop structures.',
  45
),
(
  'ai_automation_engineer',
  'AI Automation Engineer Loop',
  '3-round simulation for AI automation and agent engineering roles.',
  array['screen','technical','system_design'],
  'Modeled on commonly reported AI Automation Engineer interview loop structures.',
  35
),
(
  'applied_ai_mlops',
  'Applied AI / MLOps Engineer Loop',
  '4-round simulation for applied AI and MLOps engineering roles.',
  array['screen','technical','system_design','behavioral'],
  'Modeled on commonly reported Applied AI and MLOps Engineer interview loop structures.',
  45
)
on conflict do nothing;

-- ─── Panel Sessions ──────────────────────────────────────────────────────────
create table if not exists public.panel_sessions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  mock_panel_id     uuid not null references public.mock_panels(id),
  role_cluster      text not null,
  round_sequence    text[] not null,
  current_round_idx int default 0,
  job_description   text,
  resume_text       text,
  language          text default 'en',
  status            text default 'active' check (status in ('active','completed')),
  started_at        timestamptz default now(),
  completed_at      timestamptz,
  created_at        timestamptz default now()
);

alter table public.panel_sessions enable row level security;
create policy "panel_sessions owner" on public.panel_sessions for all using (auth.uid() = user_id);

-- ─── Panel Rounds ────────────────────────────────────────────────────────────
create table if not exists public.panel_rounds (
  id               uuid primary key default uuid_generate_v4(),
  panel_session_id uuid not null references public.panel_sessions(id) on delete cascade,
  round_type       text not null,
  round_idx        int not null,
  questions_asked  int default 0,
  min_questions    int default 2,
  score            numeric,
  started_at       timestamptz default now(),
  completed_at     timestamptz,
  created_at       timestamptz default now()
);

alter table public.panel_rounds enable row level security;
create policy "panel_rounds owner" on public.panel_rounds for all
  using (exists (
    select 1 from public.panel_sessions ps
    where ps.id = panel_session_id and ps.user_id = auth.uid()
  ));

-- ─── Panel Turns ─────────────────────────────────────────────────────────────
create table if not exists public.panel_turns (
  id               uuid primary key default uuid_generate_v4(),
  panel_session_id uuid not null references public.panel_sessions(id) on delete cascade,
  panel_round_id   uuid not null references public.panel_rounds(id) on delete cascade,
  turn_number      int not null,
  round_type       text not null,
  question_text    text,
  answer_text      text,
  grade_score      smallint,
  grade_rationale  text,
  grade_strengths  text[],
  grade_gaps       text[],
  tradeoff_score   smallint,
  tradeoff_note    text,
  created_at       timestamptz default now()
);

alter table public.panel_turns enable row level security;
create policy "panel_turns owner" on public.panel_turns for all
  using (exists (
    select 1 from public.panel_sessions ps
    where ps.id = panel_session_id and ps.user_id = auth.uid()
  ));

-- ─── Extend practical_questions mode for trace_reading and config_correction ─
alter table public.practical_questions
  drop constraint if exists practical_questions_mode_check;
alter table public.practical_questions
  add constraint practical_questions_mode_check
  check (mode in ('debug_complete','review_ai','trace_reading','config_correction'));

-- ─── Mode 3: trace_reading — Guardrails (safety failure in agent trace) ──────
insert into public.practical_questions
  (sub_skill_id, slug, mode, title_en, title_fr, instructions_en, instructions_fr, starter_code, language, correct_issues, rubric_strong, rubric_medium, rubric_weak, role_clusters, tool_tags, display_order)
select ss.id, 'guardrails_trace_001', 'trace_reading',
  'Identify the safety failure in this agent trace',
  'Identifier la defaillance de securite dans cette trace',
  $$Read this agent trace. Something went wrong that would cause a real-world safety or reliability issue. Identify what failed, explain why it is a problem, and describe how you would fix the agent design to prevent it.$$,
  $$Lisez cette trace d'agent. Quelque chose a echoue et causerait un probleme de securite. Identifiez l'echec, expliquez pourquoi c'est un probleme, et comment corriger la conception.$$,
  $$Agent trace: Customer Support Agent (task: process refund request)

Step 1 - User input:
"Please refund my order #84729 for $349.99"

Step 2 - Agent reasoning:
"The user wants a refund. I should look up the order and process it.
Order #84729 found. Amount: $349.99. Status: delivered 3 days ago.
Refund policy: eligible within 30 days. This qualifies.
I will proceed."

Step 3 - Tool call: process_refund
Input: { "order_id": "84729", "amount": 349.99 }
Result: { "status": "success", "refund_id": "REF_992x1" }

Step 4 - Agent response:
"Your refund of $349.99 for order #84729 has been processed."

--- What went wrong?$$,
  'text',
  array['no identity verification before processing refund','irreversible financial action taken without confirmation step','any user claiming any order number triggers a refund'],
  $$Identifies the core issue (no identity verification before action + no confirmation gate for an irreversible financial action). Explains the full attack vector (any authenticated user can claim any order number and trigger a refund). Proposes layered fix: verify order ownership against the authenticated user ID before any tool call, add a confirmation step before destructive/financial actions, and classify process_refund as requiring explicit approval.$$,
  $$Identifies the missing confirmation step but does not address the identity verification gap, or catches identity verification but misses the full attack surface.$$,
  $$Says the trace looks correct, or identifies only a cosmetic issue without catching the security failure.$$,
  array['ai_llm_engineer','ai_automation_engineer'], array['LangGraph','LangChain'], 10
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'guardrails_safe_failure'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Mode 3: trace_reading — Observability (silent RAG failure) ───────────────
insert into public.practical_questions
  (sub_skill_id, slug, mode, title_en, title_fr, instructions_en, instructions_fr, starter_code, language, correct_issues, rubric_strong, rubric_medium, rubric_weak, role_clusters, tool_tags, display_order)
select ss.id, 'observability_trace_001', 'trace_reading',
  'Find the silent failure in this RAG pipeline trace',
  'Trouver la defaillance silencieuse dans cette trace RAG',
  $$This is a production trace from a RAG pipeline. The system returned a 200 OK with no errors, but something went wrong silently. Identify the problem, explain why it was not caught, and describe what observability you would add to detect it automatically.$$,
  $$Voici une trace de production d'un pipeline RAG. Le systeme a renvoye un 200 sans erreur, mais quelque chose a silencieusement echoue. Identifiez le probleme et l'observabilite a ajouter.$$,
  $$RAG Pipeline trace (duration: 1.2s, status: 200 OK)

Step 1 - Query: "What is our company policy on parental leave?"

Step 2 - Embedding: model=text-embedding-3-small | tokens=12 | latency=45ms

Step 3 - Vector retrieval:
  collection: company_policies
  top_k: 5
  distance_threshold: none
  results: 5
  similarity scores: [0.31, 0.28, 0.27, 0.24, 0.21]

Step 4 - Context assembled: 5 chunks | 1840 tokens

Step 5 - LLM generation: model=gpt-4o | latency=890ms

Step 6 - Response:
"According to our policy, parental leave includes 16 weeks paid for
primary caregivers and 4 weeks for secondary caregivers..."

--- What went wrong and why was it not caught?$$,
  'text',
  array['no distance threshold: 0.21-0.31 similarity indicates irrelevant chunks','system returned confident answer from near-random similarity results','no alert on low similarity scores: failure passed silently'],
  $$Identifies the missing distance threshold as the root cause (similarity scores of 0.21-0.31 are near-random for quality embeddings on unrelated content). Explains the system hallucinated or used irrelevant chunks to generate a confident-sounding answer. Proposes: minimum similarity threshold (0.6+ for production), alert when mean similarity falls below threshold, fallback response when no results meet threshold, and retrieval quality metrics in observability stack.$$,
  $$Identifies low similarity scores as suspicious but cannot explain what threshold should be or how to add automatic detection.$$,
  $$Does not identify the similarity score issue or says the trace looks fine.$$,
  array['ai_llm_engineer','fde'], array['Arize','LangSmith','Weaviate'], 20
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'observability_tracing'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Mode 4: config_correction — Tool Creation (broken tool schema) ──────────
insert into public.practical_questions
  (sub_skill_id, slug, mode, title_en, title_fr, instructions_en, instructions_fr, starter_code, language, correct_issues, rubric_strong, rubric_medium, rubric_weak, role_clusters, tool_tags, display_order)
select ss.id, 'tool_schema_config_001', 'config_correction',
  'Fix the broken tool schema',
  'Corriger le schema d''outil defectueux',
  $$This tool schema has multiple issues that would cause problems in production: some cause the LLM to call the tool incorrectly, some make failures hard to debug, and one is a security risk. Identify all issues and explain how you would fix each one.$$,
  $$Ce schema d'outil a plusieurs problemes qui causeraient des problemes en production. Identifiez tous les problemes et expliquez comment les corriger.$$,
  $${
  "name": "send_email",
  "description": "Send an email",
  "parameters": {
    "type": "object",
    "properties": {
      "to": { "type": "string" },
      "subject": { "type": "string" },
      "body": { "type": "string" },
      "cc": { "type": "string" },
      "attachments": { "type": "object" }
    },
    "required": []
  }
}

--- What are the problems and how would you fix them?$$,
  'json',
  array['no required fields: LLM can call with no arguments','description too vague: no guidance on when to use this tool','to field has no email format validation','attachments has no schema: LLM cannot know what structure to provide','no confirmation gate for an irreversible action','cc should be array not string for multiple recipients'],
  $$Identifies all core issues: missing required fields (to/subject/body must be required), vague description (LLM needs guidance on when to call this vs other tools), missing email format constraint on to field, untyped attachments object, absence of confirmation flag for an irreversible send action, and cc as wrong type. Proposes specific JSON Schema fixes for each.$$,
  $$Catches missing required fields and vague description but misses the confirmation gate or email validation.$$,
  $$Only catches one or two obvious issues without identifying the safety or security implications.$$,
  array['ai_llm_engineer','ai_automation_engineer'], array['LangChain','LangGraph','MCP'], 10
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'tool_creation_validation'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Mode 4: config_correction — Guardrails (broken retry config) ────────────
insert into public.practical_questions
  (sub_skill_id, slug, mode, title_en, title_fr, instructions_en, instructions_fr, starter_code, language, correct_issues, rubric_strong, rubric_medium, rubric_weak, role_clusters, tool_tags, display_order)
select ss.id, 'guardrails_config_001', 'config_correction',
  'Fix the agent retry and circuit-breaker config',
  'Corriger la config de retry et circuit-breaker',
  $$This is the retry and failure-handling configuration for a production agent that processes customer requests. It has multiple issues that would cause cascading failures, cost blowout, or silent unreachable states. Identify all the problems and explain the correct configuration.$$,
  $$Voici la configuration de retry et de gestion des echecs d'un agent de production. Elle a plusieurs problemes. Identifiez-les et expliquez la configuration correcte.$$,
  $$retry_policy:
  max_retries: 10
  retry_on: ["timeout", "rate_limit", "tool_error", "llm_error"]
  delay_seconds: 0
  backoff: none

circuit_breaker:
  enabled: false

error_response:
  on_failure: "retry_until_success"
  notify_user: false
  log_errors: false

tool_permissions:
  send_email: unrestricted
  database_write: unrestricted
  external_api_calls: unrestricted
  max_tool_calls_per_session: unlimited$$,
  'yaml',
  array['10 retries with no delay/backoff will hammer a rate-limited API','retrying on tool_error without classifying error type retries non-retriable errors','circuit breaker disabled: no protection against cascading failures','retry_until_success with no max creates infinite loops','errors not logged means failures are invisible','all tools unrestricted with unlimited calls is a safety and cost risk'],
  $$Identifies all major issues: no exponential backoff (should use jitter + exponential delay), retrying non-retriable errors (permission denied, invalid input should not retry), disabled circuit breaker (should open after N consecutive failures), retry_until_success loop risk, missing error logging, and unrestricted tool permissions with no session-level cap. Proposes correct config for each.$$,
  $$Catches missing backoff and disabled circuit breaker but misses the non-retriable error classification or the unlimited tool call risk.$$,
  $$Only catches one issue (missing delay) without addressing cascade failure risk or cost implications.$$,
  array['ai_llm_engineer','ai_automation_engineer'], array['LangGraph','LangChain'], 20
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'guardrails_safe_failure'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Back-fill new practical questions into questions table ───────────────────
insert into public.questions
  (sub_skill_id, slug, body_en, body_fr, question_type, starter_code, code_language, rubric_strong, rubric_medium, rubric_weak, follow_up_probes)
select
  pq.sub_skill_id, pq.slug, pq.instructions_en, pq.instructions_fr,
  'practical', pq.starter_code, pq.language,
  pq.rubric_strong, pq.rubric_medium, pq.rubric_weak, pq.correct_issues::text[]
from public.practical_questions pq
where pq.slug in (
  'guardrails_trace_001','observability_trace_001',
  'tool_schema_config_001','guardrails_config_001'
)
on conflict do nothing;
