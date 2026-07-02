# Sonne AI — InterviewAI Platform
## Deployment guide for sonneai.com

---

## What this is

A complete Next.js 14 application replacing sonneai.com with an AI engineering interview prep platform.

**User flow:**
1. Land on sonneai.com → see InterviewAI landing page
2. Click "Start free" → create account at /signup
3. Choose role and company at /interview
4. Run a live AI interview at /interview/session
5. See score and feedback at /interview/results
6. Track progress at /dashboard

---

## Setup — 4 services needed

### 1. Supabase (database + auth)
1. Go to https://supabase.com → create a new project
2. Go to **SQL Editor** → paste and run `/supabase/migrations/001_schema.sql`
3. Go to **Project Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Authentication → URL Configuration** → set Site URL to `https://sonneai.com`
5. Add `https://sonneai.com/api/auth/callback` to Redirect URLs

### 2. Anthropic API (Claude — the interview AI)
1. Go to https://console.anthropic.com
2. Create an API key → `ANTHROPIC_API_KEY`
3. Make sure you have credits on the account

### 3. Stripe (payments — optional for MVP)
1. Go to https://stripe.com → create an account
2. Create a product: "Sonne AI Pro" at $19/month recurring
3. Copy:
   - Secret key → `STRIPE_SECRET_KEY`
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Price ID → `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
4. Set up webhook at `https://sonneai.com/api/stripe/webhook` → `STRIPE_WEBHOOK_SECRET`

> **Note:** You can skip Stripe entirely for MVP. The free tier still works — just Pro upgrades won't process payments until Stripe is configured.

### 4. Vercel (hosting)
1. Push this repo to GitHub
2. Go to https://vercel.com → import the repo
3. Add all environment variables (see below)
4. Deploy
5. In Vercel dashboard → Domains → add `sonneai.com`
6. Update your DNS to point to Vercel

---

## Environment variables

Create `.env.local` in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe (optional for MVP)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=https://sonneai.com
```

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your values
npm run dev
# Open http://localhost:3000
```

---

## Why things weren't working before

The previous version had:
1. No real API routes behind the buttons
2. No error handling — silent failures showed blank screens
3. Session page tried to fetch messages before the session existed
4. No auth middleware — protected pages were accessible without login

**What's fixed in this version:**
- Every API route has try/catch with user-facing error messages
- Session page loads messages from DB on mount with proper loading state
- Middleware protects /dashboard and /interview — redirects to /login if not signed in
- Start API stores the first AI message in DB before returning — session page always has something to show
- Error messages are visible in the UI, not just in the console

---

## File structure

```
app/
  page.tsx              ← Landing page (replaces old Sonne AI receptionist page)
  signup/page.tsx       ← Create account
  login/page.tsx        ← Sign in
  pricing/page.tsx      ← Pricing
  dashboard/page.tsx    ← User dashboard with session history
  interview/
    page.tsx            ← Role + company selector
    session/page.tsx    ← LIVE interview (the core product)
    results/page.tsx    ← Score and feedback
  api/
    auth/callback/      ← Supabase email confirmation handler
    interview/
      start/            ← Creates session, gets first AI question
      message/          ← Sends user message, gets AI response
      complete/         ← Scores the session
      results/          ← Fetches session data
      messages/         ← Fetches message history

lib/
  supabase/client.ts    ← Browser Supabase client
  supabase/server.ts    ← Server-side Supabase client
  claude/interview.ts   ← All Claude API calls
  questions/bank.ts     ← Question bank with expected components

supabase/
  migrations/001_schema.sql   ← Run this in Supabase SQL editor
```

---

## Making a user Pro (before Stripe is set up)

Go to Supabase → Table Editor → profiles → find the user → set `plan` to `'pro'`.

---

## Support
support@sonneai.com
