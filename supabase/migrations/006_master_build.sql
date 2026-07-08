-- Migration 006: Master build — tools taxonomy, new sub-skills, practical questions,
-- trade-off scoring columns, question_reports expansion, diagnostic_reports expansion

-- ─── Trade-off scoring columns (session_turns + diagnostic_reports) ───────────
alter table public.session_turns
  add column if not exists grade_tradeoff_score smallint,
  add column if not exists grade_tradeoff_note  text;

alter table public.diagnostic_reports
  add column if not exists tradeoff_avg     numeric,
  add column if not exists tradeoff_summary text;

-- ─── Tools taxonomy ───────────────────────────────────────────────────────────
create table if not exists public.tools (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null unique,
  category              text not null check (category in ('orchestration','retrieval','serving','evaluation','fine_tuning','automation')),
  applies_to_clusters   text[] not null default '{}',
  display_order         int  default 0,
  created_at            timestamptz default now()
);

alter table public.tools enable row level security;
create policy "tools read" on public.tools for select using (true);

insert into public.tools (name, category, applies_to_clusters, display_order) values
  -- orchestration
  ('LangChain',  'orchestration', array['ai_llm_engineer','ai_automation_engineer','fde'], 10),
  ('LangGraph',  'orchestration', array['ai_llm_engineer','ai_automation_engineer'],       11),
  ('CrewAI',     'orchestration', array['ai_llm_engineer','ai_automation_engineer'],       12),
  ('AutoGen',    'orchestration', array['ai_llm_engineer'],                               13),
  ('MCP',        'orchestration', array['ai_llm_engineer','fde'],                         14),
  -- retrieval
  ('LlamaIndex', 'retrieval',     array['ai_llm_engineer','fde'],                         20),
  ('Pinecone',   'retrieval',     array['ai_llm_engineer','fde'],                         21),
  ('Weaviate',   'retrieval',     array['ai_llm_engineer'],                               22),
  ('pgvector',   'retrieval',     array['ai_llm_engineer','applied_ai_mlops'],            23),
  ('Qdrant',     'retrieval',     array['ai_llm_engineer'],                               24),
  ('FAISS',      'retrieval',     array['ai_llm_engineer'],                               25),
  -- serving
  ('vLLM',       'serving',       array['ai_llm_engineer','applied_ai_mlops'],            30),
  ('TGI',        'serving',       array['ai_llm_engineer','applied_ai_mlops'],            31),
  ('Ollama',     'serving',       array['ai_llm_engineer'],                               32),
  ('Triton',     'serving',       array['applied_ai_mlops'],                              33),
  -- evaluation
  ('LangSmith',  'evaluation',    array['ai_llm_engineer','ai_automation_engineer'],      40),
  ('Arize',      'evaluation',    array['ai_llm_engineer','applied_ai_mlops'],            41),
  ('Ragas',      'evaluation',    array['ai_llm_engineer'],                               42),
  ('HELM',       'evaluation',    array['ai_llm_engineer','applied_ai_mlops'],            43),
  -- fine_tuning
  ('LoRA',       'fine_tuning',   array['ai_llm_engineer','applied_ai_mlops'],            50),
  ('QLoRA',      'fine_tuning',   array['ai_llm_engineer','applied_ai_mlops'],            51),
  ('PEFT',       'fine_tuning',   array['ai_llm_engineer','applied_ai_mlops'],            52),
  ('Unsloth',    'fine_tuning',   array['ai_llm_engineer'],                               53),
  -- automation
  ('n8n',        'automation',    array['ai_automation_engineer','fde'],                  60),
  ('Zapier',     'automation',    array['ai_automation_engineer','fde'],                  61),
  ('Retool AI',  'automation',    array['ai_automation_engineer','fde'],                  62),
  ('Make',       'automation',    array['ai_automation_engineer'],                        63)
on conflict (name) do nothing;

-- ─── New sub-skills for Agent Orchestration ───────────────────────────────────
insert into public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
select sm.id, 'tool_creation_validation', 'Tool Creation & Validation', 'Création et validation d''outils', 50
from public.skill_modules sm where sm.slug = 'agent_orchestration'
on conflict (skill_module_id, slug) do nothing;

insert into public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
select sm.id, 'memory_management', 'Memory Management', 'Gestion de la mémoire', 60
from public.skill_modules sm where sm.slug = 'agent_orchestration'
on conflict (skill_module_id, slug) do nothing;

-- ─── New sub-skills for Production / MLOps ────────────────────────────────────
insert into public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
select sm.id, 'guardrails_safe_failure', 'Guardrails & Safe Failure', 'Garde-fous et défaillance sûre', 50
from public.skill_modules sm where sm.slug = 'production_mlops'
on conflict (skill_module_id, slug) do nothing;

insert into public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
select sm.id, 'observability_tracing', 'Observability & Tracing', 'Observabilité et traçage', 60
from public.skill_modules sm where sm.slug = 'production_mlops'
on conflict (skill_module_id, slug) do nothing;

insert into public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
select sm.id, 'mcp_integration', 'MCP Integration', 'Intégration MCP', 70
from public.skill_modules sm where sm.slug = 'production_mlops'
on conflict (skill_module_id, slug) do nothing;

-- ─── Add rubric questions for new sub-skills ─────────────────────────────────
-- Tool Creation & Validation
insert into public.questions (
  sub_skill_id, slug, body_en, body_fr,
  rubric_strong, rubric_medium, rubric_weak, follow_up_probes
)
select ss.id,
  'tool_schema_design_001',
  'Walk me through how you''d design and validate a tool schema for an agent that needs to query a database — what makes a good tool schema vs a brittle one?',
  'Comment concevriez-vous et valideriez-vous un schéma d''outil pour un agent qui doit interroger une base de données ?',
  'Discusses tight JSON schema (required fields, type constraints, no open-ended any-types), idempotent vs non-idempotent classification, LLM-readable error messages for failed calls, retry policies, and confirmation logic for destructive tools. Mentions testing the schema against adversarial model outputs.',
  'Designs reasonable schemas with required fields and types, mentions error handling, but does not distinguish idempotent from non-idempotent tools or discuss LLM-readable error formats.',
  'Describes tools as "just functions with docstrings" without addressing schema precision, error propagation, or safety for write operations.',
  array['What happens when the model calls your tool with a missing required field — where does the error surface?', 'How do you distinguish between a tool that should auto-retry vs one that needs human confirmation?', 'How would you design the error message so the LLM can self-correct on the next attempt?']
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'tool_creation_validation'
on conflict (sub_skill_id, slug) do nothing;

-- Memory Management
insert into public.questions (
  sub_skill_id, slug, body_en, body_fr,
  rubric_strong, rubric_medium, rubric_weak, follow_up_probes
)
select ss.id,
  'memory_management_001',
  'An agent needs to maintain context across a 50-turn conversation while keeping prompt size manageable. Walk me through your memory architecture.',
  'Un agent doit maintenir le contexte sur une conversation de 50 tours tout en gardant la taille du prompt gérable. Décrivez votre architecture mémoire.',
  'Distinguishes working memory (in-context), episodic memory (retrieved summaries), semantic memory (vector store facts), and procedural memory (learned tool patterns). Discusses summarization triggers, relevance-based retrieval for episodic recall, and the latency/accuracy trade-off of external memory vs summarization.',
  'Mentions summarization and possibly vector retrieval but does not distinguish memory types or explain when to trigger each mechanism.',
  'Suggests "just truncate the context" or "summarize everything" without addressing selective retrieval, memory types, or context budget management.',
  array['How do you decide what to summarize vs what to keep verbatim in working memory?', 'What''s the difference between episodic and semantic memory for an agent — give a concrete example?', 'How does your approach change if the agent runs for days, not minutes?']
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'memory_management'
on conflict (sub_skill_id, slug) do nothing;

-- Guardrails & Safe Failure
insert into public.questions (
  sub_skill_id, slug, body_en, body_fr,
  rubric_strong, rubric_medium, rubric_weak, follow_up_probes
)
select ss.id,
  'guardrails_001',
  'Your LLM-powered agent is in production handling customer requests. How do you prevent it from taking harmful or irreversible actions?',
  'Votre agent LLM est en production et traite des demandes clients. Comment l''empêchez-vous de prendre des mesures nuisibles ou irréversibles ?',
  'Covers layered guardrails: input classification (intent detection before routing), output validation (structured output schemas + semantic checks), action gates (confirmation for write/delete operations, human-in-loop for high-stakes), circuit breakers (kill switch if anomaly rate spikes), and audit logging. Discusses fail-closed vs fail-open defaults and which to choose.',
  'Mentions input filtering and output validation but does not address action-level gates, circuit breakers, or the fail-closed vs fail-open distinction.',
  'Suggests "use a system prompt to tell it not to do bad things" without any structural safety mechanisms.',
  array['What''s the difference between fail-closed and fail-open — which default would you choose for a financial agent?', 'How do you detect when an agent is stuck in a harmful loop in real time, not post-hoc?', 'What''s your kill switch — how fast can you disable specific tool calls in prod without a deploy?']
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'guardrails_safe_failure'
on conflict (sub_skill_id, slug) do nothing;

-- Observability & Tracing
insert into public.questions (
  sub_skill_id, slug, body_en, body_fr,
  rubric_strong, rubric_medium, rubric_weak, follow_up_probes
)
select ss.id,
  'observability_001',
  'You''ve deployed a RAG pipeline to production. What does your observability stack look like, and what are the first three metrics you''d alert on?',
  'Vous avez déployé un pipeline RAG en production. À quoi ressemble votre stack d''observabilité et sur quelles métriques alerteriez-vous en premier ?',
  'Covers tracing (span-level: retrieval latency, reranker latency, LLM call latency), quality signals (retrieval recall proxy via chunk overlap rate, LLM output confidence, user correction rate), cost tracking (tokens/query, cost/user), and anomaly detection (sudden latency spike = retrieval degraded, sudden cost spike = token blowup). Mentions tools like LangSmith, Arize, or custom OTel spans.',
  'Mentions latency and cost monitoring but does not address retrieval-quality signals or trace-level visibility into which component degraded.',
  'Says "just check if it''s up" or "monitor error rate" without any LLM/RAG-specific metrics.',
  array['How do you detect retrieval quality degradation in prod when you don''t have ground-truth labels?', 'Your p95 latency jumped 3x overnight — walk me through how you diagnose whether it''s the retrieval step or the LLM step.', 'What''s the difference between monitoring a traditional API and monitoring an LLM pipeline?']
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'observability_tracing'
on conflict (sub_skill_id, slug) do nothing;

-- MCP Integration
insert into public.questions (
  sub_skill_id, slug, body_en, body_fr,
  rubric_strong, rubric_medium, rubric_weak, follow_up_probes
)
select ss.id,
  'mcp_integration_001',
  'What is the Model Context Protocol and when would you choose it over building a custom tool-calling integration?',
  'Qu''est-ce que le Model Context Protocol et quand le choisiriez-vous plutôt qu''une intégration d''appel d''outil personnalisée ?',
  'Explains MCP as a standardized client-server protocol that decouples tool/resource exposure from the model, enabling any MCP-compatible host to consume the same tool server without per-model integration work. Discusses when to use it: multi-model environments, tools shared across Claude/GPT/etc., IDE integrations, enterprise tooling. Compares to custom tool-calling: custom is simpler for single-model single-host; MCP wins when you need portability or have an existing MCP-compatible host. Mentions transport options (stdio, HTTP/SSE).',
  'Knows MCP is a protocol for tools/resources but cannot clearly explain when it wins over custom integration or how it differs from direct tool-calling.',
  'Confuses MCP with a specific vendor tool or cannot explain what problem it solves.',
  array['If you already have a LangChain agent with custom tools, what would you gain by wrapping those tools as an MCP server?', 'What are the security considerations when exposing an MCP server to an external model host?', 'When would you NOT use MCP?']
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'production_mlops' and ss.slug = 'mcp_integration'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Practical questions table ────────────────────────────────────────────────
create table if not exists public.practical_questions (
  id              uuid primary key default uuid_generate_v4(),
  sub_skill_id    uuid not null references public.sub_skills(id) on delete cascade,
  slug            text not null,
  mode            text not null check (mode in ('debug_complete','review_ai')),
  title_en        text not null,
  title_fr        text not null,
  instructions_en text not null,
  instructions_fr text not null,
  starter_code    text not null,     -- the code snippet shown to candidate
  language        text not null default 'python',
  correct_issues  text[] not null default '{}',   -- what a good answer identifies
  rubric_strong   text not null,
  rubric_medium   text not null,
  rubric_weak     text not null,
  role_clusters   text[] not null default '{}',
  tool_tags       text[] not null default '{}',   -- tools from tools table
  is_active       boolean default true,
  display_order   int default 0,
  created_at      timestamptz default now(),
  unique (sub_skill_id, slug)
);

alter table public.practical_questions enable row level security;
create policy "practical read" on public.practical_questions for select using (true);

-- ─── Practical questions — RAG System Design ─────────────────────────────────
-- Q1: Debug mode — broken chunking function
insert into public.practical_questions (
  sub_skill_id, slug, mode, title_en, title_fr,
  instructions_en, instructions_fr,
  starter_code, language,
  correct_issues, rubric_strong, rubric_medium, rubric_weak,
  role_clusters, tool_tags, display_order
)
select ss.id,
  'rag_chunking_debug_001',
  'debug_complete',
  'Fix the broken chunking function',
  'Corriger la fonction de découpage défectueuse',
  'The function below is supposed to chunk a document with overlap for a RAG pipeline. It has 2-3 bugs that would cause poor retrieval quality. Find and fix them. Explain why each change matters.',
  'La fonction ci-dessous est censée découper un document avec chevauchement pour un pipeline RAG. Elle contient 2-3 bugs qui causeraient une mauvaise qualité de récupération. Trouvez-les et corrigez-les. Expliquez pourquoi chaque modification est importante.',
  E'def chunk_document(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:\n    """Split a document into overlapping chunks for RAG indexing."""\n    chunks = []\n    start = 0\n    \n    while start < len(text):\n        end = start + chunk_size\n        chunk = text[start:end]\n        chunks.append(chunk)\n        start = end  # BUG 1: should be start + chunk_size - overlap\n    \n    # BUG 2: splits mid-word — should align to sentence/word boundaries\n    # BUG 3: no handling of chunks smaller than a minimum threshold (noise chunks)\n    \n    return chunks\n\n# Also: what happens when chunk_size > len(text)?\n# What happens when overlap >= chunk_size?',
  'python',
  array[
    'start = end should be start = end - overlap to actually implement overlap',
    'chunks cut mid-word/mid-sentence — should split on sentence or word boundaries',
    'no minimum chunk size filter — tiny trailing chunks add noise to the index',
    'no guard for overlap >= chunk_size which causes infinite loop'
  ],
  'Identifies all 3 bugs (no overlap, no boundary alignment, no min-chunk filter), fixes them correctly, and explains the retrieval-quality impact of each. Mentions the overlap >= chunk_size edge case.',
  'Catches the overlap bug and at least one other issue, provides a working fix, but misses one bug or does not explain retrieval impact.',
  'Fixes only the most obvious bug or provides a fix that introduces new issues without explaining why chunking strategy affects retrieval quality.',
  array['ai_llm_engineer','fde'],
  array['LlamaIndex','LangChain','Weaviate'],
  10
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'rag_system_design' and ss.slug = 'chunking_strategy'
on conflict (sub_skill_id, slug) do nothing;

-- Q2: Review AI mode — flawed RAG pipeline
insert into public.practical_questions (
  sub_skill_id, slug, mode, title_en, title_fr,
  instructions_en, instructions_fr,
  starter_code, language,
  correct_issues, rubric_strong, rubric_medium, rubric_weak,
  role_clusters, tool_tags, display_order
)
select ss.id,
  'rag_retrieval_review_001',
  'review_ai',
  'Review this AI-generated RAG retrieval pipeline',
  'Examiner ce pipeline RAG généré par IA',
  'An AI assistant generated this RAG retrieval function for a production system. It looks plausible but has a critical flaw that would cause it to fail silently in production. Identify the issue(s) and explain what you would change and why.',
  'Un assistant IA a généré cette fonction de récupération RAG pour un système de production. Elle semble plausible mais présente un défaut critique qui la ferait échouer silencieusement en production. Identifiez le(s) problème(s) et expliquez ce que vous changeriez.',
  E'import weaviate\nfrom openai import OpenAI\n\nclient = OpenAI()\nwv = weaviate.connect_to_local()\n\ndef retrieve_context(query: str, top_k: int = 5) -> str:\n    """Retrieve relevant context for a RAG query."""\n    \n    # Embed the query\n    embedding = client.embeddings.create(\n        model="text-embedding-3-small",\n        input=query\n    ).data[0].embedding\n    \n    # Search Weaviate\n    collection = wv.collections.get("Documents")\n    results = collection.query.near_vector(\n        near_vector=embedding,\n        limit=top_k\n    )\n    \n    # Concatenate results\n    context = "\\n".join([obj.properties["content"] for obj in results.objects])\n    \n    return context  # FLAW: no distance/score threshold — returns results even when\n                    # similarity is near zero (unrelated documents)\n                    # Also: no fallback when collection is empty\n                    # Also: concatenates raw chunks without source attribution',
  'python',
  array[
    'no distance threshold — retrieves top-k regardless of relevance, causing hallucination on out-of-scope queries',
    'no fallback when results are empty or collection does not exist',
    'no source attribution in returned context — LLM cannot cite sources or detect contradictions',
    'weaviate connection not closed — resource leak in production'
  ],
  'Identifies the missing distance threshold as the critical flaw and explains the hallucination risk clearly. Also catches at least one secondary issue (empty fallback or source attribution). Proposes a concrete fix with a sensible threshold value and explains how to tune it.',
  'Catches the distance threshold issue but does not fully explain the downstream hallucination risk, or proposes a fix without explaining how to calibrate the threshold.',
  'Identifies a superficial issue (e.g. variable naming) or misses the distance threshold entirely.',
  array['ai_llm_engineer','fde'],
  array['Weaviate','LlamaIndex'],
  20
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'rag_system_design' and ss.slug = 'retrieval_quality'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Practical questions — Agent Orchestration ───────────────────────────────
-- Q3: Debug — LangGraph agent with no exit condition
insert into public.practical_questions (
  sub_skill_id, slug, mode, title_en, title_fr,
  instructions_en, instructions_fr,
  starter_code, language,
  correct_issues, rubric_strong, rubric_medium, rubric_weak,
  role_clusters, tool_tags, display_order
)
select ss.id,
  'agent_loop_debug_001',
  'debug_complete',
  'Fix the agent loop that never terminates',
  'Corriger la boucle d''agent qui ne se termine jamais',
  'This LangGraph agent is supposed to research a topic and stop when it has enough information. In practice it runs forever. Find all the issues and fix them. The graph structure itself is correct — the bugs are in the logic.',
  'Cet agent LangGraph est censé rechercher un sujet et s''arrêter lorsqu''il a suffisamment d''informations. En pratique, il tourne indéfiniment. Trouvez tous les problèmes et corrigez-les.',
  E'from langgraph.graph import StateGraph, END\nfrom typing import TypedDict, Annotated\nimport operator\n\nclass AgentState(TypedDict):\n    messages: Annotated[list, operator.add]\n    research_count: int\n    has_enough_info: bool\n\ndef should_continue(state: AgentState) -> str:\n    # BUG 1: never returns END — missing the termination condition check\n    if state["has_enough_info"]:\n        return "generate_answer"  # should return END here\n    return "research"\n\ndef research_node(state: AgentState) -> AgentState:\n    # BUG 2: research_count never incremented\n    result = do_research(state["messages"][-1].content)\n    return {\n        "messages": [result],\n        "has_enough_info": len(state["messages"]) > 3  # BUG 3: checks messages not research quality\n    }\n\nworkflow = StateGraph(AgentState)\nworkflow.add_node("research", research_node)\nworkflow.add_node("generate_answer", generate_answer_node)\nworkflow.add_conditional_edges("research", should_continue)\n# BUG 4: no max_iterations guard — infinite loop if has_enough_info never becomes True',
  'python',
  array[
    'should_continue returns generate_answer instead of END when done — fix: return END when has_enough_info is True',
    'research_count never incremented in research_node',
    'termination based on message count not research quality — brittle heuristic',
    'no max_iterations guard — must add a hard stop to prevent runaway costs'
  ],
  'Identifies all 4 issues, fixes the END return, increments the counter, replaces the brittle heuristic with a better termination signal, and adds a max_iterations guard with explanation of why each matters in production.',
  'Fixes the END return bug and the missing counter, but misses the max_iterations guard or does not explain why the message-count heuristic is brittle.',
  'Only fixes one bug (typically the most obvious END bug) without addressing the runaway loop risk.',
  array['ai_llm_engineer','ai_automation_engineer'],
  array['LangGraph','LangChain'],
  10
from public.sub_skills ss
join public.skill_modules sm on ss.skill_module_id = sm.id
where sm.slug = 'agent_orchestration' and ss.slug = 'failure_handling_recovery'
on conflict (sub_skill_id, slug) do nothing;

-- ─── Expand question_reports schema ──────────────────────────────────────────
alter table public.question_reports
  add column if not exists depth          text check (depth in ('core','applied','deep_dive')) default 'applied',
  add column if not exists frequently_asked boolean default false,
  add column if not exists company_size   text,
  add column if not exists industry       text,
  add column if not exists year           int,
  add column if not exists entry_type     text default 'user_submitted' check (entry_type in ('seeded','user_submitted')),
  add column if not exists source_url     text,
  add column if not exists upvotes        int default 0;

-- Auto-set frequently_asked when upvotes > threshold
create or replace function public.update_frequently_asked()
returns trigger language plpgsql as $$
begin
  if new.upvotes >= 10 then
    new.frequently_asked := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trig_frequently_asked on public.question_reports;
create trigger trig_frequently_asked
  before update on public.question_reports
  for each row execute function public.update_frequently_asked();

-- ─── Seed question_reports ────────────────────────────────────────────────────
insert into public.question_reports (
  display_name, role_title, role_cluster, company_visibility,
  interview_round, question_text, depth, difficulty_rating,
  outcome, entry_type, status, upvotes, source_note, year
) values
  ('alex_m', 'AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'We use a flat FAISS index today. At what point does switching to HNSW become worth it, and what do you trade off when you make that switch?',
   'deep_dive', 4, 'offer', 'seeded', 'published', 14,
   'Reported by multiple candidates across AI engineer interview loops at LLM-native companies. Frequently appears in system design rounds.',
   2025),

  ('priya_k', 'Applied AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'system_design',
   'Your product team wants to improve answer quality on long documents. Walk me through why you''d choose RAG over fine-tuning for this use case, and when you''d reverse that decision.',
   'deep_dive', 5, 'offer', 'seeded', 'published', 18,
   'Common deep-dive question in AI engineering system design rounds. Tests trade-off reasoning.',
   2025),

  ('james_t', 'LLM Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'Your eval pipeline shows 94% accuracy on your golden set but users are still complaining about hallucinations. What''s wrong and how do you fix your eval approach?',
   'deep_dive', 4, 'no_offer', 'seeded', 'published', 9,
   'Frequently cited in post-interview debriefs. Tests understanding of eval/prod distribution shift.',
   2025),

  ('sofia_r', 'AI Automation Engineer', 'ai_automation_engineer', 'undisclosed',
   'technical',
   'You need to build an agent that can browse the web, write code, and send emails. How do you design the tool schema and what guardrails do you add before it can send anything?',
   'applied', 3, 'offer', 'seeded', 'published', 7,
   'Common in AI automation and agentic roles. Tests tool design + safety thinking.',
   2025),

  ('marcus_l', 'ML Engineer', 'applied_ai_mlops', 'undisclosed',
   'system_design',
   'Your inference cost tripled overnight with no change in traffic. Walk me through your diagnosis process step by step.',
   'applied', 4, 'offer', 'seeded', 'published', 11,
   'Classic MLOps interview question in production LLM roles.',
   2025),

  ('nina_p', 'AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'How do you detect when a LangGraph agent is stuck in a silent failure loop — not crashing, just not making progress?',
   'deep_dive', 5, 'prefer_not_to_say', 'seeded', 'published', 6,
   'Common in agent engineering roles. Tests observability + agent failure mode knowledge.',
   2025),

  ('daniel_w', 'Applied AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'screen',
   'What is the difference between semantic chunking and fixed-size chunking, and when would you use each?',
   'core', 2, 'offer', 'seeded', 'published', 5,
   'Common screening question for RAG-heavy roles.',
   2025),

  ('amira_h', 'Forward Deployed Engineer', 'fde', 'undisclosed',
   'final',
   'A customer says the AI assistant you deployed keeps making up information that isn''t in their knowledge base. How do you diagnose and fix this without access to their data?',
   'applied', 3, 'offer', 'seeded', 'published', 8,
   'Common in FDE and customer-facing AI roles. Tests RAG debugging + communication skills.',
   2025),

  ('leo_b', 'LLM Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'Explain how you''d use vLLM''s continuous batching to improve throughput, and what the latency trade-off is vs standard batching.',
   'deep_dive', 4, 'offer', 'seeded', 'published', 12,
   'Common in inference engineering and MLOps roles at companies running their own models.',
   2025),

  ('chloe_d', 'AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'What''s the difference between LLM-as-judge and human eval, and when does LLM-as-judge break down?',
   'applied', 3, 'offer', 'seeded', 'published', 15,
   'Very common in evaluation-focused AI engineering roles.',
   2025),

  ('ryan_s', 'AI Automation Engineer', 'ai_automation_engineer', 'undisclosed',
   'technical',
   'You''re building an n8n workflow that triggers an LLM to process incoming emails. What could go wrong and how do you make it robust to failures?',
   'applied', 3, 'offer', 'seeded', 'published', 4,
   'Common in AI automation roles, especially at companies using workflow tools.',
   2025),

  ('elena_v', 'Applied AI Engineer', 'applied_ai_mlops', 'undisclosed',
   'system_design',
   'Design an eval harness for a RAG system where you don''t have ground-truth labels. What metrics do you use and how do you detect regressions?',
   'deep_dive', 5, 'offer', 'seeded', 'published', 10,
   'Common in applied AI / MLOps roles. Tests eval design without labeled data.',
   2025),

  ('tom_k', 'AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'What is the Model Context Protocol (MCP) and how would you decide whether to build a custom tool integration vs wrap it as an MCP server?',
   'applied', 3, 'prefer_not_to_say', 'seeded', 'published', 3,
   'Emerging question in AI engineering roles as MCP adoption grows.',
   2025),

  ('sarah_c', 'LLM Engineer', 'ai_llm_engineer', 'undisclosed',
   'technical',
   'You need to rerank retrieved chunks before passing them to the LLM. Walk me through your reranking strategy and what you gain vs retrieval-only.',
   'applied', 4, 'offer', 'seeded', 'published', 9,
   'Common in RAG-heavy engineering roles. Tests retrieval pipeline depth.',
   2025),

  ('omar_j', 'AI Engineer', 'ai_llm_engineer', 'undisclosed',
   'final',
   'Your agent''s tool calls are succeeding but the final answer is wrong. How do you trace which step failed and what instrumentation would have caught it earlier?',
   'deep_dive', 5, 'offer', 'seeded', 'published', 7,
   'Common final-round question for agentic AI engineering roles.',
   2025)

on conflict do nothing;
