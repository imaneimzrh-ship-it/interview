import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

const PILLAR_META: Record<string, { label: string; tier: string }> = {
  rag:                  { label: 'RAG System Design',       tier: 'free' },
  agent_orchestration:  { label: 'Agent Orchestration',     tier: 'pro'  },
  evaluation_testing:   { label: 'Evaluation & Testing',    tier: 'pro'  },
  production_mlops:     { label: 'Production / MLOps',      tier: 'pro'  },
}

export async function GET(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('exercises')
    .select('topic_pillar')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.topic_pillar] = (counts[row.topic_pillar] ?? 0) + 1
  }

  const pillars = Object.keys(PILLAR_META).map(pillar => ({
    pillar,
    label: PILLAR_META[pillar].label,
    exercise_count: counts[pillar] ?? 0,
    tier: PILLAR_META[pillar].tier,
  }))

  return NextResponse.json(pillars)
}
