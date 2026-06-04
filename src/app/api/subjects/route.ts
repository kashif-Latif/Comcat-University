import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/subjects - List subjects
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    const userId = (session.user as Record<string, unknown>).id as string

    const subjects = await supabaseQuery<any>("subjects", {
      query: "order=code.asc",
    })

    // Enrich with teachers and enrollment counts
    const enriched = await Promise.all(
      subjects.map(async (s: any) => {
        const [teachers, enrollments] = await Promise.all([
          supabaseQuery<any>("subject_teachers", {
            query: `subjectId=eq.${s.id}&select=teacherId`,
          }),
          supabaseQuery<any>("enrollments", {
            query: `subjectId=eq.${s.id}&select=id`,
          }),
        ])

        // Fetch teacher details for each assignment
        const teacherDetails = await Promise.all(
          teachers.map(async (t: any) => {
            const users = await supabaseQuery<any>("users", {
              query: `id=eq.${t.teacherId}&select=id,name,teacherId`,
            })
            return { id: t.id, teacher: users[0] || { id: t.teacherId, name: 'Unknown', teacherId: null } }
          })
        )

        return {
          ...s,
          teachers: teacherDetails.filter((td) => td.teacher !== null),
          _count: {
            enrollments: enrollments.length,
          },
        }
      })
    )

    // Students only see their enrolled subjects
    if (role === "STUDENT") {
      const enrollments = await supabaseQuery<any>("enrollments", {
        query: `studentId=eq.${userId}&select=subjectId`,
      })
      const enrolledIds = enrollments.map((e) => e.subjectId)
      return NextResponse.json(enriched.filter((s) => enrolledIds.includes(s.id)))
    }

    // Teachers only see their assigned subjects
    if (role === "TEACHER") {
      const assignments = await supabaseQuery<any>("subject_teachers", {
        query: `teacherId=eq.${userId}&select=subjectId`,
      })
      const assignedIds = assignments.map((a) => a.subjectId)
      return NextResponse.json(enriched.filter((s) => assignedIds.includes(s.id)))
    }

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/subjects - Create a subject (admin only)
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
    const { code, name, description, credits, semester, department, teacherIds } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 })
    }

    const existing = await supabaseQuery<any>("subjects", {
      query: `code=eq.${encodeURIComponent(code)}`,
    })
    if (existing.length > 0) {
      return NextResponse.json({ error: "Subject code already exists" }, { status: 409 })
    }

    const created = await supabaseQuery<any>("subjects", {
      method: "POST",
      body: {
        code,
        name,
        description,
        credits: credits || 3,
        semester,
        department,
      },
    })

    const subject = created[0]

    // Create teacher assignments if provided
    if (teacherIds && Array.isArray(teacherIds)) {
      await Promise.all(
        teacherIds.map((teacherId: string) =>
          supabaseQuery("subject_teachers", {
            method: "POST",
            body: { subjectId: subject.id, teacherId },
          })
        )
      )
    }

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error("Error creating subject:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/subjects - Update a subject (admin only)
export async function PUT(req: NextRequest) {
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
    const { id, code, name, description, credits, semester, department } = body

    if (!id) {
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (code) updateData.code = code
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (credits !== undefined) updateData.credits = credits
    if (semester !== undefined) updateData.semester = semester
    if (department !== undefined) updateData.department = department

    const updated = await supabaseQuery<any>("subjects", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: updateData,
    })

    return NextResponse.json(updated[0] || {})
  } catch (error) {
    console.error("Error updating subject:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/subjects - Delete a subject (admin only)
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
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 })
    }

    await supabaseQuery("subjects", {
      method: "DELETE",
      query: `id=eq.${id}`,
    })

    return NextResponse.json({ message: "Subject deleted successfully" })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
