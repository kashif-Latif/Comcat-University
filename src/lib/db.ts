// ─── Database Abstraction ─────────────────────────────────
// This project uses Supabase REST API (supabaseQuery) instead of Prisma.
// This stub is kept for compatibility in case any code expects a Prisma-like client.
// All actual DB operations go through @/lib/supabase

import { supabaseQuery } from './supabase'

export const db = {
  // Delegates to supabaseQuery under the hood
  query: supabaseQuery,
}

export type DB = typeof db
