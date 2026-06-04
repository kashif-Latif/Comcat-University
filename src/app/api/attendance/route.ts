import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/attendance - Get attendance records
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
    const studentId = searchParams.get("studentId")
    const date = searchParams.get("date")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const filters: string[] = []

    // Students only see their own attendance
    if (role === "STUDENT") {
      filters.push(`studentId=eq.${userId}`)
    } else if (role === "TEACHER") {
      // Teachers only see attendance for their subjects
      if (!subjectId) {
        return NextResponse.json({ error: "Subject ID required for teachers" }, { status: 400 })
      }
      const assignment = await supabaseQuery<any>("subject_teachers", {
        query: `teacherId=eq.${userId}&subjectId=eq.${subjectId}`,
      })
      if (assignment.length === 0) {
        return NextResponse.json({ error: "Not assigned to this subject" }, { status: 403 })
      }
      filters.push(`teacherId=eq.${userId}`)
    }

    if (subjectId) filters.push(`subjectId=eq.${subjectId}`)
    if (studentId && role !== "STUDENT") filters.push(`studentId=eq.${studentId}`)

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      filters.push(`date=gte.${startDate.toISOString()}`)
      filters.push(`date=lte.${endDate.toISOString()}`)
    }
    if (from && to) {
      filters.push(`date=gte.${new Date(from).toISOString()}`)
      filters.push(`date=lte.${new Date(to).toISOString()}`)
    }

    // Add ordering
    filters.push("order=date.desc")

    const query = filters.join("&")
    const records = await supabaseQuery<any>("attendance_records", { query })

    // Enrich with student, subject, and teacher data
    const enriched = await Promise.all(
      records.map(async (r: any) => {
        const [students, subjects, teachers] = await Promise.all([
          supabaseQuery<any>("users", { query: `id=eq.${r.studentId}&select=id,name,studentId,department` }),
          supabaseQuery<any>("subjects", { query: `id=eq.${r.subjectId}&select=id,name,code` }),
          supabaseQuery<any>("users", { query: `id=eq.${r.teacherId}&select=id,name` }),
        ])
        return {
          ...r,
          student: students[0] || { id: r.studentId, name: 'Unknown', studentId: null, department: null },
          subject: subjects[0] || { id: r.subjectId, name: 'Unknown', code: '—' },
          teacher: teachers[0] || { id: r.teacherId, name: 'Unknown' },
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/attendance - Create attendance records (teacher only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only teachers can mark attendance" }, { status: 403 })
    }

    const body = await req.json()
    const { subjectId, date, records } = body

    if (!subjectId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Subject ID, date, and records are required" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string

    // Verify teacher is assigned to this subject
    if (role === "TEACHER") {
      const assignment = await supabaseQuery<any>("subject_teachers", {
        query: `teacherId=eq.${userId}&subjectId=eq.${subjectId}`,
      })
      if (assignment.length === 0) {
        return NextResponse.json({ error: "Not assigned to this subject" }, { status: 403 })
      }
    }

    const attendanceDate = new Date(date)
    attendanceDate.setHours(0, 0, 0, 0)

    const results: any[] = []

    for (const record of records) {
      const { studentId, status, remarks } = record

      // Check for existing record (upsert logic)
      const existing = await supabaseQuery<any>("attendance_records", {
        query: `studentId=eq.${studentId}&subjectId=eq.${subjectId}&date=eq.${attendanceDate.toISOString()}`,
      })

      if (existing.length > 0) {
        // Update
        const updated = await supabaseQuery<any>("attendance_records", {
          method: "PATCH",
          query: `id=eq.${existing[0].id}`,
          body: {
            status: status || "PRESENT",
            remarks,
            teacherId: userId,
          },
        })
        results.push(updated[0] || existing[0])
      } else {
        // Create
        const created = await supabaseQuery<any>("attendance_records", {
          method: "POST",
          body: {
            studentId,
            subjectId,
            teacherId: userId,
            date: attendanceDate.toISOString(),
            status: status || "PRESENT",
            remarks,
          },
        })
        results.push(created[0])
      }
    }

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error("Error creating attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/attendance - Update attendance record (teacher only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only teachers can update attendance" }, { status: 403 })
    }

    const body = await req.json()
    const { id, status, remarks } = body

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (remarks !== undefined) updateData.remarks = remarks

    const updated = await supabaseQuery<any>("attendance_records", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: updateData,
    })

    return NextResponse.json(updated[0] || {})
  } catch (error) {
    console.error("Error updating attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
