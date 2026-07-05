import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const mailer = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@sonneai.com',
    pass: process.env.SMTP_PASS!,
  },
})

async function sendProWelcomeEmail(to: string, name?: string | null) {
  const displayName = name ?? to.split('@')[0]
  await mailer.sendMail({
    from: '"Sonne AI" <support@sonneai.com>',
    to,
    subject: 'Welcome to Sonne AI Pro 🎉',
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FBFAF7;color:#17140F">
        <div style="margin-bottom:24px">
          <span style="font-size:20px;font-weight:700">Sonne AI</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">You're on Pro, ${displayName}.</h1>
        <p style="font-size:15px;color:#7A7267;margin:0 0 24px;line-height:1.6">
          Your Pro plan is now active. You have unlimited interview sessions across all 4 modules — RAG System Design, Agent Orchestration, Evaluation &amp; Testing, and Production / MLOps.
        </p>
        <a href="https://sonneai.com/app/start"
          style="display:inline-block;background:#F5A524;color:#17140F;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none">
          Start practising →
        </a>
        <hr style="margin:32px 0;border:none;border-top:1px solid #E7E2D8" />
        <p style="font-size:12px;color:#9CA3AF;margin:0">
          Questions? Reply to this email — we read every one.<br/>
          <a href="https://sonneai.com" style="color:#9CA3AF">sonneai.com</a>
        </p>
      </div>
    `,
  })
}

async function sendPaymentFailedEmail(to: string, name?: string | null) {
  const displayName = name ?? to.split('@')[0]
  await mailer.sendMail({
    from: '"Sonne AI" <support@sonneai.com>',
    to,
    subject: 'Action needed: your Sonne AI payment failed',
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FBFAF7;color:#17140F">
        <div style="margin-bottom:24px">
          <span style="font-size:20px;font-weight:700">Sonne AI</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Hi ${displayName}, your payment didn't go through.</h1>
        <p style="font-size:15px;color:#7A7267;margin:0 0 24px;line-height:1.6">
          We couldn't process your most recent subscription payment. Please update your payment method to keep Pro access.
        </p>
        <a href="https://sonneai.com/pricing"
          style="display:inline-block;background:#F5A524;color:#17140F;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none">
          Update payment →
        </a>
        <hr style="margin:32px 0;border:none;border-top:1px solid #E7E2D8" />
        <p style="font-size:12px;color:#9CA3AF;margin:0">
          Need help? Reply to this email.<br/>
          <a href="https://sonneai.com" style="color:#9CA3AF">sonneai.com</a>
        </p>
      </div>
    `,
  })
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
        // Send welcome email
        const email = session.customer_details?.email ?? session.customer_email
        if (email) {
          const { data: profile } = await sb.from('profiles').select('full_name').eq('id', userId).single()
          await sendProWelcomeEmail(email, profile?.full_name).catch(err => console.error('Welcome email error:', err))
        }
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

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      if (customerId) {
        const { data: profile } = await sb.from('profiles').select('id, full_name').eq('stripe_customer', customerId).single()
        if (profile) {
          const { data: authUser } = await sb.auth.admin.getUserById(profile.id)
          const email = authUser?.user?.email
          if (email) {
            await sendPaymentFailedEmail(email, profile.full_name).catch(err => console.error('Payment failed email error:', err))
          }
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
