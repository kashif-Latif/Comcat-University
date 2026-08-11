// ─── Supabase REST API Client (PostgREST) ─────────────────
// SECURITY MODEL:
//   - In the browser, the anon key is available (NEXT_PUBLIC_).
//     RLS on the DB restricts what anon can do (see supabase/rls-setup.sql).
//   - On the server, we prefer the SERVICE_ROLE key which bypasses RLS,
//     because API routes have already checked the NextAuth session and role.
//   - SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the browser
//     (no NEXT_PUBLIC_ prefix).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Detect whether we're running on the server or in the browser.
const IS_SERVER = typeof window === 'undefined'

// Pick the strongest key available for this environment.
function pickKey(): string {
  if (IS_SERVER && SUPABASE_SERVICE_ROLE_KEY) return SUPABASE_SERVICE_ROLE_KEY
  return SUPABASE_ANON_KEY
}

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && (SUPABASE_ANON_KEY.length > 0 || SUPABASE_SERVICE_ROLE_KEY.length > 0)
}

export interface SupabaseQueryOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
  query?: string           // PostgREST filter string, e.g. 'role=eq.STUDENT'
  headers?: Record<string, string>
  select?: string          // columns to return, defaults to '*'
}

/**
 * Generic Supabase REST API query helper.
 *
 * @param table  - The database table name
 * @param opts   - Query options
 * @returns      - Array of rows for GET/POST/PATCH; empty array for DELETE
 */
export async function supabaseQuery<T = Record<string, unknown>>(
  table: string,
  opts: SupabaseQueryOptions = {}
): Promise<T[]> {
  if (!isSupabaseConfigured()) {
    console.warn(`[Supabase] Not configured — skipping ${opts.method || 'GET'} ${table}`)
    return []
  }

  const key = pickKey()

  const {
    method = 'GET',
    body,
    query,
    headers: extraHeaders = {},
    select = '*',
  } = opts

  const TABLES_WITH_UPDATED_AT = new Set([
    'users', 'admissions', 'announcements', 'subjects',
    'enrollments', 'fees', 'teachers',
  ])

  let payload = body
  if (method === 'POST' && body) {
    payload = {
      ...body,
      ...(body.id ? {} : { id: crypto.randomUUID() }),
      ...(body.createdAt ? {} : { createdAt: new Date().toISOString() }),
      ...(TABLES_WITH_UPDATED_AT.has(table) && !body.updatedAt
        ? { updatedAt: new Date().toISOString() }
        : {}),
    }
  }

  if (method === 'PATCH' && body) {
    payload = {
      ...body,
      ...(TABLES_WITH_UPDATED_AT.has(table) && !body.updatedAt
        ? { updatedAt: new Date().toISOString() }
        : {}),
    }
  }

  const urlStr = `${SUPABASE_URL}/rest/v1/${table}`
  const params: string[] = []

  let effectiveSelect = select
  if (query) {
    const queryParts = query.startsWith('?') ? query.slice(1) : query
    for (const pair of queryParts.split('&')) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx > 0) {
        const k = pair.slice(0, eqIdx)
        const v = pair.slice(eqIdx + 1)
        if (k === 'select') effectiveSelect = v
        else params.push(pair)
      }
    }
  }
  params.unshift(`select=${effectiveSelect}`)

  const fullUrl = params.length > 0 ? `${urlStr}?${params.join('&')}` : urlStr

  const fetchOpts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: method === 'POST' ? 'return=representation' : 'count=exact',
      ...extraHeaders,
    },
  }

  if (payload && (method === 'POST' || method === 'PATCH')) {
    fetchOpts.body = JSON.stringify(payload)
  }

  const response = await fetch(fullUrl, fetchOpts)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase ${method} ${table} failed (${response.status}): ${errorText}`)
  }

  if (response.status === 204 || method === 'DELETE') return []

  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}
