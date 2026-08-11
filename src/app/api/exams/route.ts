import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { requireRole } from "@/lib/api-guard"

// ─── Helper: does this teacher teach this subject? ────────
async function teacherOwnsSubject(teacherId: string, subjectId: string): Promise<boolean> {
  const rows = await supabaseQuery<any>("subject_teachers", {
    query: `subjectId=eq.${subjectId}&teacherId=eq.${teacherId}&select=id&limit=1`,
  })
  return Array.isArray(rows) && rows.length > 0
}

// ─── Helper: enrich exam rows with subject metadata ───────
async function enrichExams(exams: any[]) {
  if (exams.length === 0) return exams
  const subjectIds = [...new Set(exams.map(e => e.subjectId))]
  const subjects = await supabaseQuery<any>("subjects", {
    query: `id=in.(${subjectIds.join(",")})&select=id,code,name,credits,semester,department`,
  })
  const byId = new Map(subjects.map(s => [s.id, s]))
  return exams.map(e => ({ ...e, subject: byId.get(e.subjectId) || null }))
}

// ─── GET /api/exams ───────────────────────────────────────
// - ADMIN: all exams (optional ?subjectId filter)
// - TEACHER: exams for their subjects (optional ?subjectId filter, restricted to owned)
// - STUDENT: exams for their enrolled subjects
export async function GET(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER', 'STUDENT'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const subjectIdFilter = searchParams.get("subjectId")

    if (role === 'ADMIN') {
      const q = subjectIdFilter
        ? `subjectId=eq.${subjectIdFilter}&order=examDate.desc.nullslast,createdAt.desc`
        : `order=examDate.desc.nullslast,createdAt.desc`
      const exams = await supabaseQuery<any>("exams", { query: q })
      return NextResponse.json(await enrichExams(exams))
    }

    if (role === 'TEACHER') {
      const owned = await supabaseQuery<any>("subject_teachers", {
        query: `teacherId=eq.${userId}&select=subjectId`,
      })
      const ownedIds = owned.map((r: any) => r.subjectId)
      if (ownedIds.length === 0) return NextResponse.json([])

      // If a specific subject is requested, verify ownership first
      if (subjectIdFilter && !ownedIds.includes(subjectIdFilter)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const ids = subjectIdFilter ? [subjectIdFilter] : ownedIds
      const exams = await supabaseQuery<any>("exams", {
        query: `subjectId=in.(${ids.join(",")})&order=examDate.desc.nullslast,createdAt.desc`,
      })
      return NextResponse.json(await enrichExams(exams))
    }

    // STUDENT
    const enrollments = await supabaseQuery<any>("enrollments", {
      query: `studentId=eq.${userId}&select=subjectId`,
    })
    const enrolledIds = enrollments.map((e: any) => e.subjectId)
    if (enrolledIds.length === 0) return NextResponse.json([])

    if (subjectIdFilter && !enrolledIds.includes(subjectIdFilter)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const ids = subjectIdFilter ? [subjectIdFilter] : enrolledIds
    const exams = await supabaseQuery<any>("exams", {
      query: `subjectId=in.(${ids.join(",")})&order=examDate.desc.nullslast,createdAt.desc`,
    })
    return NextResponse.json(await enrichExams(exams))
  } catch (err) {
    console.error("Error fetching exams:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── POST /api/exams ─── Teacher or admin creates an exam
export async function POST(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const body = await req.json()
    const { subjectId, title, type, totalMarks, examDate, semester } = body

    if (!subjectId || !title || !type || !totalMarks) {
      return NextResponse.json(
        { error: "subjectId, title, type, totalMarks are required" },
        { status: 400 }
      )
    }
    const validTypes = ['QUIZ','ASSIGNMENT','MID','FINAL','PROJECT','LAB']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 })
    }
    if (Number(totalMarks) <= 0) {
      return NextResponse.json({ error: "totalMarks must be > 0" }, { status: 400 })
    }

    if (role === 'TEACHER' && !(await teacherOwnsSubject(userId, subjectId))) {
      return NextResponse.json({ error: "You do not teach this subject" }, { status: 403 })
    }

    const created = await supabaseQuery<any>("exams", {
      method: "POST",
      body: {
        subjectId,
        title: String(title).slice(0, 200),
        type,
        totalMarks: Number(totalMarks),
        examDate: examDate || null,
        semester: semester ?? null,
        createdBy: userId,
      },
    })

    return NextResponse.json(created[0], { status: 201 })
  } catch (err) {
    console.error("Error creating exam:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── PUT /api/exams ─── Update an exam
export async function PUT(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const body = await req.json()
    const { id, title, type, totalMarks, examDate, semester } = body

    if (!id) return NextResponse.json({ error: "Exam ID is required" }, { status: 400 })

    // For teacher, must own the exam's subject
    if (role === 'TEACHER') {
      const existing = await supabaseQuery<any>("exams", { query: `id=eq.${id}&select=subjectId&limit=1` })
      if (!existing[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
      if (!(await teacherOwnsSubject(userId, existing[0].subjectId))) {
        return NextResponse.json({ error: "You do not teach this subject" }, { status: 403 })
      }
    }

    const update: Record<string, unknown> = {}
    if (title !== undefined) update.title = String(title).slice(0, 200)
    if (type !== undefined) update.type = type
    if (totalMarks !== undefined) update.totalMarks = Number(totalMarks)
    if (examDate !== undefined) update.examDate = examDate
    if (semester !== undefined) update.semester = semester

    const updated = await supabaseQuery<any>("exams", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: update,
    })
    return NextResponse.json(updated[0] || {})
  } catch (err) {
    console.error("Error updating exam:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── DELETE /api/exams?id=xxx ───
export async function DELETE(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Exam ID is required" }, { status: 400 })

    if (role === 'TEACHER') {
      const existing = await supabaseQuery<any>("exams", { query: `id=eq.${id}&select=subjectId&limit=1` })
      if (!existing[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
      if (!(await teacherOwnsSubject(userId, existing[0].subjectId))) {
        return NextResponse.json({ error: "You do not teach this subject" }, { status: 403 })
      }
    }

    await supabaseQuery("exams", { method: "DELETE", query: `id=eq.${id}` })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting exam:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
