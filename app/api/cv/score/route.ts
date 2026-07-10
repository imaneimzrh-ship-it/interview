import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { CreditService } from '@/lib/credits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const AI_MODEL = 'claude-sonnet-4-6'

// Per-user rate limit: 3 CV scores per hour (signed-in users only)
const rateMap = new Map<string, { count: number; reset: number }>()
function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.reset) { rateMap.set(key, { count: 1, reset: now + 3_600_000 }); return false }
  if (entry.count >= 3) return true
  entry.count++; return false
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function POST(req: NextRequest) {
  // Sign-in required — middleware enforces this for the page, but API must also guard
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  if (isRateLimited(user.id)) return NextResponse.json({ error: 'Too many requests — try again later.' }, { status: 429 })

  // ── Free-tier CV lifetime gate (server-side, DB-backed) ──
  // markCvScoreUsed() was already recording usage but hasUsedFreeCvScore() was
  // never checked — so the 1-lifetime limit was phantom. Fixed here.
  const adminSb = adminClient()
  const { data: profileData } = await adminSb.from('profiles').select('plan').eq('id', user.id).single()
  const isPro = profileData?.plan === 'pro'
  if (!isPro) {
    const hasUsed = await CreditService.hasUsedFreeCvScore(adminSb, user.id, user.email ?? '')
    if (hasUsed) {
      return NextResponse.json({
        error: 'You have already used your free CV diagnostic. Upgrade to Pro for unlimited access.',
        upgrade: true,
      }, { status: 403 })
    }
  }

  let body: { cv: string; lang?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }

  const cv = (body.cv ?? '').trim()
  if (!cv || cv.length < 50)  return NextResponse.json({ error: 'CV text is too short. Paste at least a few lines.' }, { status: 400 })
  const cvCapped = cv.slice(0, 6000)
  const lang = body.lang === 'fr' ? 'French' : 'English'

  const prompt = `You are a hiring lead screening a CV for an AI Engineer role in 2026 (Applied AI, LLM, MLOps, or Automation Engineer). Score STRICTLY against these 5 signals:

1. PRODUCTION EVIDENCE (key: "production"): Shipped systems serving real users with metrics — not demos, notebooks, or courses. Look for: scale numbers, latency/cost metrics, on-call experience, incident response. Penalise: "100% accuracy" claims, demos presented as production, no inference-cost awareness.

2. RAG DEPTH (key: "rag"): Chunking strategy beyond naive fixed-size, hybrid retrieval (dense + sparse), reranking (cross-encoder or ColBERT), retrieval quality evaluation. Sub-skills to detect: FAISS vs HNSW trade-off awareness, embedding model selection, freshness strategies. Penalise: only LangChain + Pinecone with no eval.

3. AGENTIC EXPERIENCE (key: "agentic"): Agent frameworks (LangGraph, CrewAI, AutoGen), tool creation and schema design, memory management (working/episodic/semantic), multi-agent coordination, failure handling and recovery, MCP integration. Penalise: only "built a chatbot" with no tool use or failure handling.

4. EVALUATION LITERACY (key: "eval"): Golden sets, LLM-as-judge validated against human labels, regression gates, offline vs online eval split, observability and tracing (LangSmith, Arize, Ragas). This is the strongest hiring signal for 2026. Penalise: no eval work whatsoever, or only BLEU/ROUGE.

5. COST & SAFETY (key: "cost"): Token budgets, model routing, KV cache, streaming, guardrails, prompt-injection defence, safe failure patterns, MCP security. Penalise: no cost awareness on any LLM project.

Also look for 2026 red flags: a 2024-mindset stack of only LangChain + Pinecone + a ChatGPT wrapper; no mention of eval or production evidence; demos presented as production; "100% accuracy" claims.

CV: """${cvCapped}"""

For recommendSubSkill, pick the single most specific sub-skill gap from this list: chunking_strategy, retrieval_quality, reranking, rag_freshness, tool_use_design, memory_management, tool_creation_validation, multi_agent_coordination, failure_handling_recovery, mcp_integration, eval_design, hallucination_detection, offline_online_eval, regression_gates, observability_tracing, guardrails_safe_failure, cost_latency_optimisation, deployment_versioning.

Return ONLY this JSON, no markdown, human text in ${lang}:
{"overall":0,"signals":[{"key":"production","score":0,"band":"Strong|Developing|Gap","evidence":"specific line or absence"},{"key":"rag","score":0,"band":"Strong|Developing|Gap","evidence":""},{"key":"agentic","score":0,"band":"Strong|Developing|Gap","evidence":""},{"key":"eval","score":0,"band":"Strong|Developing|Gap","evidence":""},{"key":"cost","score":0,"band":"Strong|Developing|Gap","evidence":""}],"strengths":["max 2 short bullets"],"gap":"the single most important fix, one sentence, name the specific missing sub-skill","flags":["red flags, or empty"],"recommendModule":"RAG System Design|Agent Orchestration|Evaluation & Testing|Production / MLOps","recommendSubSkill":"one slug from the list above","recommendWhy":"one sentence linking the gap to the specific sub-skill and module"}`

  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw  = (msg.content[0] as any).text as string
    const data = extractJson(raw)

    // Mark usage after successful scoring (not before, so a failed Claude call
    // doesn't consume the user's one free score). Reuses adminSb from gate above.
    if (!isPro) {
      await CreditService.markCvScoreUsed(adminSb, user.id, user.email ?? '').catch(err =>
        console.error('[cv/score] markCvScoreUsed failed:', err)
      )
    }

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[cv/score]', e)
    return NextResponse.json({ error: 'Scoring failed. Please try again.' }, { status: 500 })
  }
}
