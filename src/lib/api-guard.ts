// ─── API Guard Helpers ─────────────────────────────────────
// Reusable primitives for auth + rate limiting across API routes.
// Kept dependency-free so it works on Vercel Edge/Node runtimes.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'

/**
 * Require an authenticated session with one of the allowed roles.
 * Returns { session, user } on success, or a NextResponse to short-circuit.
 */
export async function requireRole(allowed: Role[]) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const role = (session.user as Record<string, unknown>).role as Role
  if (!allowed.includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, user: session.user, role }
}

// ─── Simple in-memory rate limiter ─────────────────────────
// Note: on Vercel serverless, each cold-start gets a fresh Map.
// For a portfolio deployment this is enough to block casual abuse.
// For real traffic swap this for Upstash Redis @upstash/ratelimit.

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

// Clean expired buckets occasionally to prevent memory growth
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k)
  }
}

/**
 * Fixed-window rate limit keyed by (ip + route).
 *   limit: max requests per window
 *   windowMs: window size in ms
 * Returns null if OK, or a 429 NextResponse if exceeded.
 */
export function rateLimit(
  req: NextRequest,
  route: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now()
  sweep(now)

  // Best-effort IP extraction — Vercel sets x-forwarded-for
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const key = `${route}:${ip}`
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  bucket.count += 1
  return null
}
