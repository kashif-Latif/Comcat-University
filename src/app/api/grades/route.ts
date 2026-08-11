import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { requireRole } from "@/lib/api-guard"

// ─── Helper: does teacher own the exam's subject? ─────────
async function teacherOwnsExam(teacherId: string, examId: string): Promise<boolean> {
  const exam = await supabaseQuery<any>("exams", {
    query: `id=eq.${examId}&select=subjectId&limit=1`,
  })
  if (!exam[0]) return false
  const st = await supabaseQuery<any>("subject_teachers", {
    query: `subjectId=eq.${exam[0].subjectId}&teacherId=eq.${teacherId}&select=id&limit=1`,
  })
  return st.length > 0
}

// ─── GET /api/grades ─────────────────────────────────────
// Modes:
//   ?examId=xxx           → all grades for one exam (teacher/admin)
//   ?studentId=xxx        → all grades for one student (admin, teacher, or self)
//   ?examId=xxx&studentId=xxx → single grade lookup
export async function GET(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER', 'STUDENT'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get("examId")
    const studentIdQ = searchParams.get("studentId")

    // Students can only see their own grades
    if (role === 'STUDENT') {
      if (studentIdQ && studentIdQ !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const filters: string[] = [`studentId=eq.${userId}`, "order=createdAt.desc"]
      if (examId) filters.push(`examId=eq.${examId}`)
      const grades = await supabaseQuery<any>("grades", { query: filters.join("&") })
      return NextResponse.json(grades)
    }

    if (role === 'TEACHER' && examId && !(await teacherOwnsExam(userId, examId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const filters: string[] = ["order=createdAt.desc"]
    if (examId) filters.push(`examId=eq.${examId}`)
    if (studentIdQ) filters.push(`studentId=eq.${studentIdQ}`)
    const grades = await supabaseQuery<any>("grades", { query: filters.join("&") })
    return NextResponse.json(grades)
  } catch (err) {
    console.error("Error fetching grades:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── POST /api/grades ────────────────────────────────────
// Two modes:
//   { examId, studentId, marksObtained, remarks? }  — single upsert
//   { examId, entries: [{ studentId, marksObtained, remarks? }, ...] } — batch
// Behavior: if a grade already exists for (examId, studentId), it's updated;
// otherwise inserted. This makes the "enter grades" screen safe to re-submit.
export async function POST(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const body = await req.json()

    // Resolve the target exam
    const examId: string = body.examId
    if (!examId) return NextResponse.json({ error: "examId is required" }, { status: 400 })

    // Teacher must own the exam's subject
    if (role === 'TEACHER' && !(await teacherOwnsExam(userId, examId))) {
      return NextResponse.json({ error: "You do not teach this subject" }, { status: 403 })
    }

    // Fetch exam for totalMarks validation
    const examRows = await supabaseQuery<any>("exams", { query: `id=eq.${examId}&select=id,totalMarks&limit=1` })
    if (!examRows[0]) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    const maxMarks = Number(examRows[0].totalMarks)

    // Normalize into a list of entries
    const entries: Array<{ studentId: string; marksObtained: number; remarks?: string }> = Array.isArray(body.entries)
      ? body.entries
      : [{ studentId: body.studentId, marksObtained: body.marksObtained, remarks: body.remarks }]

    // Validate every entry up front (fail fast)
    for (const e of entries) {
      if (!e.studentId) return NextResponse.json({ error: "Every entry needs a studentId" }, { status: 400 })
      const m = Number(e.marksObtained)
      if (Number.isNaN(m) || m < 0) return NextResponse.json({ error: `Invalid marks for ${e.studentId}` }, { status: 400 })
      if (m > maxMarks) return NextResponse.json({ error: `Marks (${m}) exceed exam total (${maxMarks}) for ${e.studentId}` }, { status: 400 })
    }

    // Fetch existing grades for these students so we know which to insert vs update
    const studentIds = entries.map(e => e.studentId)
    const existing = await supabaseQuery<any>("grades", {
      query: `examId=eq.${examId}&studentId=in.(${studentIds.join(",")})&select=id,studentId`,
    })
    const existingByStudent = new Map<string, string>(existing.map((g: any) => [g.studentId, g.id]))

    const results: any[] = []
    for (const e of entries) {
      const marks = Number(e.marksObtained)
      const remarks = e.remarks ? String(e.remarks).slice(0, 500) : null
      const gradeId = existingByStudent.get(e.studentId)

      if (gradeId) {
        // Update
        const updated = await supabaseQuery<any>("grades", {
          method: "PATCH",
          query: `id=eq.${gradeId}`,
          body: { marksObtained: marks, remarks, gradedBy: userId },
        })
        results.push(updated[0])
      } else {
        // Insert
        const created = await supabaseQuery<any>("grades", {
          method: "POST",
          body: {
            examId,
            studentId: e.studentId,
            marksObtained: marks,
            remarks,
            gradedBy: userId,
          },
        })
        results.push(created[0])
      }
    }

    return NextResponse.json({ success: true, count: results.length, grades: results })
  } catch (err) {
    console.error("Error saving grades:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── DELETE /api/grades?id=xxx ─── Teacher can wipe a grade
export async function DELETE(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Grade ID is required" }, { status: 400 })

    if (role === 'TEACHER') {
      const g = await supabaseQuery<any>("grades", { query: `id=eq.${id}&select=examId&limit=1` })
      if (!g[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
      if (!(await teacherOwnsExam(userId, g[0].examId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await supabaseQuery("grades", { method: "DELETE", query: `id=eq.${id}` })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting grade:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
