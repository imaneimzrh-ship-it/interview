import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerUser } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { CreditService } from '@/lib/credits'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const AI_MODEL = 'claude-sonnet-4-6'

// Rate-limit anonymous calls: 10 per IP per hour (in-memory, fine for single Vercel instance)
const rateMap = new Map<string, { count: number; reset: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) { rateMap.set(ip, { count: 1, reset: now + 3_600_000 }); return false }
  if (entry.count >= 10) return true
  entry.count++; return false
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'

  // ── Per-user gate (server-side, DB-enforced) ─────────────────────────────
  // Authenticated users: 1 free CV score ever (by user_id AND email).
  // Anonymous users:     IP rate limit as fallback.
  const { user } = await getServerUser(req)
  if (user) {
    const adminSb = adminClient()
    const alreadyUsed = await CreditService.hasUsedFreeCvScore(adminSb, user.id, user.email ?? '')
    if (alreadyUsed) {
      return NextResponse.json({
        error: 'cv_already_used',
        message: 'You have already used your free CV score. Sign in to a different account or contact support.',
      }, { status: 403 })
    }
  } else {
    if (isRateLimited(ip)) return NextResponse.json({ error: 'Too many requests — try again later.' }, { status: 429 })
  }

  let body: { cv: string; lang?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }

  const cv = (body.cv ?? '').trim()
  if (!cv || cv.length < 50)  return NextResponse.json({ error: 'CV text is too short. Paste at least a few lines.' }, { status: 400 })
  const cvCapped = cv.slice(0, 6000)
  const lang = body.lang === 'fr' ? 'French' : 'English'

  const prompt = `You are a hiring lead screening a CV for an Applied AI Engineer role in 2026. Score STRICTLY against: production evidence (shipped systems serving real users, with metrics — not demos, notebooks, or courses), RAG depth (hybrid retrieval, reranking, retrieval evaluation), agentic experience (planners, tool use, memory, multi-agent failure modes), evaluation literacy (golden sets, LLM-as-judge validated against human labels, regression gates — the strongest hiring signal), and cost & safety (token budgets, model routing, caching, guardrails / prompt-injection). Penalise recruiter red flags: "100% accuracy" claims, no inference-cost awareness, a 2024-mindset stack of only LangChain + Pinecone + a ChatGPT wrapper with no eval or production evidence, and demos presented as production.

CV: """${cvCapped}"""

Return ONLY this JSON, no markdown, human text in ${lang}:
{"overall":0,"signals":[{"key":"production","score":0,"band":"Strong|Developing|Gap","evidence":"specific line or absence"},{"key":"rag","score":0,"band":"Strong|Developing|Gap","evidence":""},{"key":"agentic","score":0,"band":"Strong|Developing|Gap","evidence":""},{"key":"eval","score":0,"band":"Strong|Developing|Gap","evidence":""},{"key":"cost","score":0,"band":"Strong|Developing|Gap","evidence":""}],"strengths":["max 2 short bullets"],"gap":"the single most important fix, one sentence","flags":["red flags, or empty"],"recommendModule":"RAG System Design|Agentic Systems|Evaluation & Observability|Cost, Latency & Safety","recommendWhy":"one sentence linking the gap to the module"}`

  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw  = (msg.content[0] as any).text as string
    const data = extractJson(raw)

    // Mark usage after successful scoring (not before, so a failed Claude call
    // doesn't consume the user's one free score)
    if (user) {
      const adminSb = adminClient()
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
