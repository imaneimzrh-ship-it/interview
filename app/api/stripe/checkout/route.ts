import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerUser } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { data: profile } = await sb.from('profiles').select('stripe_customer, plan').eq('id', user.id).single()
    if (profile?.plan === 'pro') return NextResponse.json({ error: 'Already on Pro.' }, { status: 400 })

    // Reuse or create Stripe customer
    let customerId = profile?.stripe_customer
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_user_id: user.id } })
      customerId = customer.id
      await sb.from('profiles').update({ stripe_customer: customerId }).eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonneai.com'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: `Stripe error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}
