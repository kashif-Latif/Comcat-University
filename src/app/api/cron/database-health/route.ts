import { NextRequest, NextResponse } from "next/server"
import { isSupabaseConfigured, supabaseQuery } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/cron/database-health
 *
 * Called by Vercel Cron once per day. It performs three tiny, read-only
 * Supabase queries so an otherwise rarely used free-tier project still has
 * regular user database activity.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase environment variables are not configured",
      },
      { status: 503 }
    )
  }

  const startedAt = Date.now()

  try {
    const checks = await Promise.all([
      supabaseQuery("users", {
        query: "select=id&limit=1",
      }),
      supabaseQuery("subjects", {
        query: "select=id&limit=1",
      }),
      supabaseQuery("announcements", {
        query: "select=id&limit=1",
      }),
    ])

    return NextResponse.json(
      {
        ok: true,
        database: "reachable",
        checksCompleted: checks.length,
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("[Database health cron] Supabase health check failed:", error)

    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}
