import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerUser } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const { sb, user } = await getServerUser(req)
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const { data: profile } = await sb
      .from('profiles')
      .select('stripe_customer, plan')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer as string | null

    // If no customer ID stored, look up by email in Stripe
    if (!customerId && user.email) {
      const list = await stripe.customers.list({ email: user.email, limit: 1 })
      if (list.data.length > 0) {
        customerId = list.data[0].id
        // Backfill the missing customer ID
        await sb.from('profiles').update({ stripe_customer: customerId }).eq('id', user.id)
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe billing account found. Contact support@sonneai.com.' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonneai.com'
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json(
      { error: `Stripe error: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 }
    )
  }
}
