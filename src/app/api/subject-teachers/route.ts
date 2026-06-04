import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/subject-teachers - Get subject-teacher assignments
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assignments = await supabaseQuery<any>("subject_teachers", {
      query: "select=id,subjectId,teacherId",
    })

    // Enrich with subject and teacher data
    const enriched = await Promise.all(
      assignments.map(async (a: any) => {
        const [subjects, teachers] = await Promise.all([
          supabaseQuery<any>("subjects", {
            query: `id=eq.${a.subjectId}&select=id,name,code`,
          }),
          supabaseQuery<any>("users", {
            query: `id=eq.${a.teacherId}&select=id,name,teacherId`,
          }),
        ])
        return {
          ...a,
          subject: subjects[0] || null,
          teacher: teachers[0] || null,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching subject teachers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/subject-teachers - Assign teacher to subject (admin only)
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
    const { subjectId, teacherId } = body

    if (!subjectId || !teacherId) {
      return NextResponse.json({ error: "Subject ID and Teacher ID are required" }, { status: 400 })
    }

    const created = await supabaseQuery<any>("subject_teachers", {
      method: "POST",
      body: { subjectId, teacherId },
    })

    const assignment = created[0]

    // Enrich with subject and teacher data
    const [subjects, teachers] = await Promise.all([
      supabaseQuery<any>("subjects", {
        query: `id=eq.${assignment.subjectId}&select=id,name,code`,
      }),
      supabaseQuery<any>("users", {
        query: `id=eq.${assignment.teacherId}&select=id,name,teacherId`,
      }),
    ])

    const enriched = {
      ...assignment,
      subject: subjects[0] || null,
      teacher: teachers[0] || null,
    }

    return NextResponse.json(enriched, { status: 201 })
  } catch (error) {
    console.error("Error creating subject teacher:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/subject-teachers - Remove teacher from subject (admin only)
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

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await supabaseQuery("subject_teachers", {
      method: "DELETE",
      query: `id=eq.${id}`,
    })

    return NextResponse.json({ message: "Assignment removed successfully" })
  } catch (error) {
    console.error("Error deleting subject teacher:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
