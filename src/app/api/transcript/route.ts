import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { requireRole } from "@/lib/api-guard"
import { buildTranscript, type SubjectTranscriptInput } from "@/lib/grading"

// GET /api/transcript
// - Students: their own transcript (no query params)
// - Admin/Teacher: ?studentId=xxx returns any student's transcript
export async function GET(req: NextRequest) {
  const guard = await requireRole(['ADMIN', 'TEACHER', 'STUDENT'])
  if ('error' in guard) return guard.error

  try {
    const role = (guard.session!.user as Record<string, unknown>).role as string
    const userId = (guard.session!.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const studentIdQ = searchParams.get("studentId")

    // Students can only see their own
    const targetStudentId = role === 'STUDENT' ? userId : (studentIdQ || userId)
    if (role === 'STUDENT' && studentIdQ && studentIdQ !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 1. Enrolled subjects
    const enrollments = await supabaseQuery<any>("enrollments", {
      query: `studentId=eq.${targetStudentId}&select=subjectId`,
    })
    const subjectIds = enrollments.map((e: any) => e.subjectId)
    if (subjectIds.length === 0) {
      return NextResponse.json({
        subjects: [], semesters: [], cgpa: null, totalCredits: 0,
      })
    }

    // 2. Subject metadata + all exams for those subjects
    const [subjects, exams] = await Promise.all([
      supabaseQuery<any>("subjects", {
        query: `id=in.(${subjectIds.join(",")})&select=id,code,name,credits,semester`,
      }),
      supabaseQuery<any>("exams", {
        query: `subjectId=in.(${subjectIds.join(",")})&select=id,subjectId,title,type,totalMarks,examDate`,
      }),
    ])

    // 3. This student's grades on those exams
    let gradesByExam: Map<string, any> = new Map()
    if (exams.length > 0) {
      const examIds = exams.map((e: any) => e.id)
      const grades = await supabaseQuery<any>("grades", {
        query: `studentId=eq.${targetStudentId}&examId=in.(${examIds.join(",")})&select=examId,marksObtained`,
      })
      gradesByExam = new Map(grades.map((g: any) => [g.examId, g]))
    }

    // 4. Build the transcript input
    const examsBySubject = new Map<string, any[]>()
    for (const e of exams) {
      if (!examsBySubject.has(e.subjectId)) examsBySubject.set(e.subjectId, [])
      examsBySubject.get(e.subjectId)!.push(e)
    }

    const input: SubjectTranscriptInput[] = subjects.map((s: any) => ({
      subjectId: s.id,
      subjectCode: s.code,
      subjectName: s.name,
      credits: Number(s.credits) || 3,
      semester: s.semester ?? null,
      exams: (examsBySubject.get(s.id) || []).map((e: any) => {
        const g = gradesByExam.get(e.id)
        return {
          examId: e.id,
          title: e.title,
          type: e.type,
          totalMarks: Number(e.totalMarks),
          marksObtained: g ? Number(g.marksObtained) : null,
        }
      }),
    }))

    const transcript = buildTranscript(input)
    return NextResponse.json(transcript)
  } catch (err) {
    console.error("Error building transcript:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
