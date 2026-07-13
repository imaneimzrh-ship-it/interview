import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const supabase = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: exercise, error } = await supabase
    .from('exercises')
    .select('id, title, difficulty, format, grading_mode, language, task_description, test_cases, rubric_criteria, topic_pillar, topic_tags')
    .eq('id', id)
    .single()

  if (error || !exercise) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })

  // Never expose reference_solution_notes
  return NextResponse.json(exercise)
}
