import { NextResponse } from 'next/server'
import { supabaseQuery, isSupabaseConfigured } from '@/lib/supabase'

// GET /api/health
// - Public liveness probe
// - Touches Supabase with a cheap 1-row read
// - This is what the GitHub Action / Vercel Cron pings every few days
//   to prevent the free-tier Supabase project from being auto-paused.

export const dynamic = 'force-dynamic'  // never cache — always hit the DB
export const runtime = 'nodejs'

export async function GET() {
  const startedAt = Date.now()
  const status: Record<string, unknown> = {
    ok: true,
    service: 'comcat-university',
    timestamp: new Date().toISOString(),
  }

  if (!isSupabaseConfigured()) {
    status.ok = false
    status.supabase = 'not-configured'
    return NextResponse.json(status, { status: 503 })
  }

  try {
    // Cheapest possible query — one row from a small table.
    // The `users` table always exists once the schema is seeded.
    await supabaseQuery('users', { query: 'select=id&limit=1' })
    status.supabase = 'reachable'
    status.latencyMs = Date.now() - startedAt
    return NextResponse.json(status)
  } catch (err) {
    status.ok = false
    status.supabase = 'unreachable'
    status.error = String(err).slice(0, 200)
    return NextResponse.json(status, { status: 503 })
  }
}
