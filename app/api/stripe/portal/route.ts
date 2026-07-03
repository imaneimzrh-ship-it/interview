import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerUser } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { data: profile } = await sb.from('profiles').select('stripe_customer').eq('id', user.id).single()
    if (!profile?.stripe_customer) return NextResponse.json({ error: 'No billing account found.' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonneai.com'
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer,
      configuration: 'bpc_1TpAdAJI52o88eqM1IyeaCoO',
      return_url: `${appUrl}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: `Stripe error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
