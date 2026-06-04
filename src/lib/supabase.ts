// ─── Supabase REST API Client (PostgREST) ─────────────────
// Lightweight wrapper around Supabase's REST API.
// Uses the publishable/anon key for all operations (RLS is disabled).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
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
  // Guard: if Supabase is not configured, return empty results
  if (!isSupabaseConfigured()) {
    console.warn(`[Supabase] Not configured — skipping ${opts.method || 'GET'} ${table}`)
    return []
  }

  const {
    method = 'GET',
    body,
    query,
    headers: extraHeaders = {},
    select = '*',
  } = opts

  // Tables that have an updatedAt column in Supabase
  const TABLES_WITH_UPDATED_AT = new Set([
    'users', 'admissions', 'announcements', 'subjects',
    'enrollments', 'fees', 'teachers',
  ])

  // For POST, auto-add id, createdAt, and updatedAt
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

  // For PATCH, auto-add updatedAt for tables that need it
  if (method === 'PATCH' && body) {
    payload = {
      ...body,
      ...(TABLES_WITH_UPDATED_AT.has(table) && !body.updatedAt
        ? { updatedAt: new Date().toISOString() }
        : {}),
    }
  }

  // Build URL manually to avoid double-encoding
  const urlStr = `${SUPABASE_URL}/rest/v1/${table}`
  const params: string[] = []

  // Add select parameter
  let effectiveSelect = select
  if (query) {
    // Check if query contains a select= override
    const queryParts = query.startsWith('?') ? query.slice(1) : query
    for (const pair of queryParts.split('&')) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx > 0) {
        const key = pair.slice(0, eqIdx)
        const value = pair.slice(eqIdx + 1)
        if (key === 'select') {
          effectiveSelect = value
        } else {
          params.push(pair)
        }
      }
    }
  }
  params.unshift(`select=${effectiveSelect}`)

  const fullUrl = params.length > 0 ? `${urlStr}?${params.join('&')}` : urlStr

  // Build fetch options
  const fetchOpts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'count=exact',
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

  // DELETE returns 204 No Content
  if (response.status === 204 || method === 'DELETE') {
    return []
  }

  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}
