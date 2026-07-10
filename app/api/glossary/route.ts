import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const sb = await createClient()
    const { searchParams } = new URL(req.url)
    const category    = searchParams.get('category')
    const roleCluster = searchParams.get('role_cluster')

    let query = sb
      .from('tools_glossary')
      .select('id, name, category, one_line_definition, common_interview_angle, role_clusters, display_order')
      .order('display_order')

    if (category)    query = query.eq('category', category)
    if (roleCluster) query = query.contains('role_clusters', [roleCluster])

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ tools: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
