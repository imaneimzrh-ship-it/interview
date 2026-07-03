import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 400 })
  }

  const sb = adminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      if (userId) {
        await sb.from('profiles').update({ plan: 'pro', stripe_customer: session.customer as string }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const { data: profile } = await sb.from('profiles').select('id').eq('stripe_customer', customerId).single()
      if (profile) {
        await sb.from('profiles').update({ plan: 'free' }).eq('id', profile.id)
      }
      break
    }

    case 'customer.subscription.resumed':
    case 'invoice.payment_succeeded': {
      const obj = event.data.object as Stripe.Invoice | Stripe.Subscription
      const customerId = (obj as Stripe.Invoice).customer as string
      if (customerId) {
        const { data: profile } = await sb.from('profiles').select('id').eq('stripe_customer', customerId).single()
        if (profile) {
          await sb.from('profiles').update({ plan: 'pro' }).eq('id', profile.id)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
