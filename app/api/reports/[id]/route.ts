import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

// GET /api/reports/:id — public
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = adminClient()
  const { data, error } = await sb
    .from('interview_reports')
    .select('id, question_text, cluster, round, role_track, company_name, year, outcome, upvote_count, created_at, approved_at')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  return NextResponse.json(data)
}
