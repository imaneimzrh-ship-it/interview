import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

// GET /api/admin/ads-performance
// Returns Google Ads campaign metrics for the last 7 days.
// Requires GOOGLE_ADS_DEVELOPER_TOKEN + GOOGLE_ADS_REFRESH_TOKEN in env
// (set these once you have OAuth2 credentials from Google Cloud Console).
//
// Until those credentials are set this returns a stub so the endpoint is
// available and the admin page can render without crashing.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
const ADS_CUSTOMER_ID = '2242135301'  // your Ads account ID, no dashes

export async function GET(req: NextRequest) {
  const { user } = await getServerUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const devToken     = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const clientId     = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET

  if (!devToken || !refreshToken || !clientId || !clientSecret) {
    return NextResponse.json({
      stub: true,
      message: 'Google Ads API credentials not yet configured. Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN in env.',
      customer_id: ADS_CUSTOMER_ID,
      campaigns: [],
    })
  }

  try {
    // Exchange refresh token for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenData.error_description ?? 'OAuth token error')
    const accessToken = tokenData.access_token

    // Query Google Ads API
    const query = `
      SELECT
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING LAST_7_DAYS
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `

    const adsRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${ADS_CUSTOMER_ID}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization':    `Bearer ${accessToken}`,
          'developer-token':  devToken,
          'Content-Type':     'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!adsRes.ok) {
      const err = await adsRes.text()
      throw new Error(`Google Ads API error: ${err.slice(0, 200)}`)
    }

    const rows = await adsRes.json()
    const campaigns = (rows ?? []).flatMap((batch: { results?: unknown[] }) =>
      (batch.results ?? []).map((r: unknown) => {
        const row = r as {
          campaign: { name: string; status: string }
          metrics: { impressions: string; clicks: string; cost_micros: string; conversions: string; conversions_value: string }
        }
        return {
          name:        row.campaign.name,
          status:      row.campaign.status,
          impressions: parseInt(row.metrics.impressions ?? '0', 10),
          clicks:      parseInt(row.metrics.clicks ?? '0', 10),
          spend_usd:   parseInt(row.metrics.cost_micros ?? '0', 10) / 1_000_000,
          conversions: parseFloat(row.metrics.conversions ?? '0'),
        }
      })
    )

    return NextResponse.json({ stub: false, customer_id: ADS_CUSTOMER_ID, campaigns })
  } catch (err) {
    console.error('[ads-performance]', err)
    return NextResponse.json({ error: 'Failed to fetch Ads data', detail: String(err) }, { status: 500 })
  }
}
