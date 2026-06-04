import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/enrollments - Get enrollments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    const userId = (session.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    const filters: string[] = []

    if (role === "STUDENT") {
      filters.push(`studentId=eq.${userId}`)
    }

    if (subjectId) {
      filters.push(`subjectId=eq.${subjectId}`)
    }

    const query = filters.length > 0 ? filters.join("&") : undefined

    const enrollments = await supabaseQuery<any>("enrollments", { query })

    // Enrich with student and subject data
    const enriched = await Promise.all(
      enrollments.map(async (e: any) => {
        const [students, subjects] = await Promise.all([
          supabaseQuery<any>("users", { query: `id=eq.${e.studentId}&select=id,name,studentId,department,semester` }),
          supabaseQuery<any>("subjects", { query: `id=eq.${e.subjectId}&select=id,name,code,credits` }),
        ])
        return {
          ...e,
          student: students[0] || { id: e.studentId, name: 'Unknown', studentId: null, department: null, semester: null },
          subject: subjects[0] || { id: e.subjectId, name: 'Unknown', code: '—', credits: 0 },
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/enrollments - Create enrollment (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { studentId, subjectId, grade } = body

    if (!studentId || !subjectId) {
      return NextResponse.json({ error: "Student ID and Subject ID are required" }, { status: 400 })
    }

    // Check if enrollment already exists (upsert logic)
    const existing = await supabaseQuery<any>("enrollments", {
      query: `studentId=eq.${studentId}&subjectId=eq.${subjectId}`,
    })

    let result
    if (existing.length > 0) {
      // Update existing
      if (grade !== undefined) {
        const updated = await supabaseQuery<any>("enrollments", {
          method: "PATCH",
          query: `studentId=eq.${studentId}&subjectId=eq.${subjectId}`,
          body: { grade },
        })
        result = updated[0]
      } else {
        result = existing[0]
      }
    } else {
      // Create new
      const created = await supabaseQuery<any>("enrollments", {
        method: "POST",
        body: { studentId, subjectId, grade },
      })
      result = created[0]
    }

    // Enrich with student and subject data
    const [students, subjects] = await Promise.all([
      supabaseQuery<any>("users", { query: `id=eq.${result.studentId}&select=id,name,studentId` }),
      supabaseQuery<any>("subjects", { query: `id=eq.${result.subjectId}&select=id,name,code` }),
    ])

    const enriched = {
      ...result,
      student: students[0] || { id: result.studentId, name: 'Unknown', studentId: null },
      subject: subjects[0] || { id: result.subjectId, name: 'Unknown', code: '—' },
    }

    return NextResponse.json(enriched, { status: 201 })
  } catch (error) {
    console.error("Error creating enrollment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/enrollments - Delete enrollment (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const studentId = searchParams.get("studentId")
    const subjectId = searchParams.get("subjectId")

    if (id) {
      await supabaseQuery("enrollments", {
        method: "DELETE",
        query: `id=eq.${id}`,
      })
    } else if (studentId && subjectId) {
      await supabaseQuery("enrollments", {
        method: "DELETE",
        query: `studentId=eq.${studentId}&subjectId=eq.${subjectId}`,
      })
    } else {
      return NextResponse.json({ error: "ID or studentId+subjectId required" }, { status: 400 })
    }

    return NextResponse.json({ message: "Enrollment deleted successfully" })
  } catch (error) {
    console.error("Error deleting enrollment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
