import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { sb, user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  let body: { cv?: string; report?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }) }

  const cv     = (body.cv ?? '').trim()
  const report = body.report

  const results: Record<string, unknown> = {}

  // Upsert CV text (one per user)
  if (cv) {
    const { error } = await sb
      .from('cvs')
      .upsert({ user_id: user.id, text: cv.slice(0, 9000), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    results.cvSaved = true
  }

  // Insert CV report
  if (report && typeof report === 'object') {
    const { data, error } = await sb.from('cv_reports').insert({
      user_id:          user.id,
      overall:          report.overall ?? 0,
      signals:          report.signals ?? [],
      strengths:        report.strengths ?? [],
      gap:              report.gap ?? '',
      flags:            report.flags ?? [],
      recommend_module: report.recommendModule ?? '',
      recommend_why:    report.recommendWhy ?? '',
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    results.reportId = data?.id
  }

  return NextResponse.json(results)
}
