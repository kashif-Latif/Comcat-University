// ─── AI Chatbot Tools ──────────────────────────────────────
// Tool definitions the chatbot can call, plus their server-side executors.
//
// SECURITY MODEL:
//   - Every executor receives the *session user's* id from getServerSession().
//   - Tool arguments from the LLM are NEVER used to identify who the data
//     belongs to (no `studentId` from the LLM ever hits Supabase).
//   - Even if a user prompts "get admin's grades", the LLM might try to
//     call a tool with someone else's id — the server ignores that field
//     and uses session.user.id. This is our prompt-injection defense.
//
//   - Tools that fetch "someone else's" data (e.g. teacher looking at
//     their students) still verify ownership via subject_teachers before
//     returning anything.

import { supabaseQuery } from '@/lib/supabase'
import { buildTranscript, type SubjectTranscriptInput } from '@/lib/grading'

// ─── OpenAI-format tool schema (Groq supports this natively) ────
export interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string; enum?: string[] }>
      required?: string[]
    }
  }
}

// The context handed to every executor
export interface ToolContext {
  userId: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'ANON'
  userName?: string
}

// ─── Student tools ─────────────────────────────────────────
const STUDENT_TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_transcript',
      description: "Get the current student's academic transcript — CGPA, semester-wise GPAs, and grades per subject. Use this whenever the student asks about their grades, GPA, CGPA, marks, academic performance, or how they are doing academically.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_attendance',
      description: "Get the current student's attendance summary — how many classes they attended vs missed per subject. Use this when they ask about attendance, absences, or class participation.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_fees',
      description: "Get the current student's fee records — amount due, paid, pending, semester breakdown. Use this when they ask about fees, dues, payments, or fee status.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_subjects',
      description: "Get the subjects the current student is enrolled in this semester, along with the teachers, credit hours, and semester. Use this when they ask what courses they're taking, who their teachers are, or their timetable.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_upcoming_exams',
      description: "Get exams scheduled in the future for the current student's enrolled subjects. Use this when they ask about upcoming exams, tests, quizzes, midterms, or finals.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_announcements',
      description: 'Get recent published announcements from the university. Use this when the student asks about news, updates, or announcements.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ─── Teacher tools ─────────────────────────────────────────
const TEACHER_TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_teaching_load',
      description: 'Get the subjects the current teacher is assigned to teach, along with enrollment counts per subject.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_announcements',
      description: 'Get recent published announcements from the university.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ─── Admin tools ───────────────────────────────────────────
const ADMIN_TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'get_university_stats',
      description: 'Get top-level university statistics — total students, teachers, subjects, pending admissions, unread contact messages.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_announcements',
      description: 'Get recent published announcements from the university.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ─── Return the tool list for a given role ────────────────
export function toolsForRole(role: ToolContext['role']): ToolSchema[] {
  switch (role) {
    case 'STUDENT': return STUDENT_TOOLS
    case 'TEACHER': return TEACHER_TOOLS
    case 'ADMIN':   return ADMIN_TOOLS
    default:        return []   // anonymous users get no tools
  }
}

// ─── Executors ─────────────────────────────────────────────
// Each returns a plain string (compact + LLM-friendly).
// Any errors are caught and returned as a short human error string
// so the LLM can gracefully explain to the user.

async function execGetMyTranscript(ctx: ToolContext): Promise<string> {
  try {
    const enrollments = await supabaseQuery<any>('enrollments', {
      query: `studentId=eq.${ctx.userId}&select=subjectId`,
    })
    const subjectIds = enrollments.map((e: any) => e.subjectId)
    if (subjectIds.length === 0) return 'The student is not enrolled in any subjects yet.'

    const [subjects, exams] = await Promise.all([
      supabaseQuery<any>('subjects', {
        query: `id=in.(${subjectIds.join(',')})&select=id,code,name,credits,semester`,
      }),
      supabaseQuery<any>('exams', {
        query: `subjectId=in.(${subjectIds.join(',')})&select=id,subjectId,title,type,totalMarks`,
      }),
    ])

    let gradesByExam = new Map<string, any>()
    if (exams.length > 0) {
      const examIds = exams.map((e: any) => e.id)
      const grades = await supabaseQuery<any>('grades', {
        query: `studentId=eq.${ctx.userId}&examId=in.(${examIds.join(',')})&select=examId,marksObtained`,
      })
      gradesByExam = new Map(grades.map((g: any) => [g.examId, g]))
    }

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
    const t = buildTranscript(input)

    // Compact summary the LLM can quote back
    const lines: string[] = []
    lines.push(`CGPA: ${t.cgpa !== null ? t.cgpa.toFixed(2) + ' / 4.00' : 'not graded yet'}`)
    lines.push(`Total credit hours graded: ${t.totalCredits}`)
    for (const sem of t.semesters) {
      lines.push(`\nSemester ${sem.semester} (GPA: ${sem.gpa !== null ? sem.gpa.toFixed(2) : '—'}):`)
      for (const sub of sem.subjects) {
        const grade = sub.letter
          ? `${sub.percent?.toFixed(1)}% (${sub.letter}, ${sub.gpaPoints?.toFixed(1)} pts)`
          : 'not graded yet'
        lines.push(`  - ${sub.subjectCode} ${sub.subjectName} [${sub.credits} cr]: ${grade}`)
      }
    }
    return lines.join('\n')
  } catch (err) {
    console.error('get_my_transcript failed:', err)
    return 'Error: could not fetch transcript data.'
  }
}

async function execGetMyAttendance(ctx: ToolContext): Promise<string> {
  try {
    const records = await supabaseQuery<any>('attendance_records', {
      query: `studentId=eq.${ctx.userId}&select=subjectId,status,date&order=date.desc`,
    })
    if (records.length === 0) return 'No attendance records found for this student yet.'

    // Group by subject
    const bySubject = new Map<string, { present: number; absent: number; total: number }>()
    for (const r of records) {
      const s = bySubject.get(r.subjectId) || { present: 0, absent: 0, total: 0 }
      s.total++
      if (String(r.status).toUpperCase() === 'PRESENT') s.present++
      else s.absent++
      bySubject.set(r.subjectId, s)
    }

    // Get subject names
    const subjectIds = [...bySubject.keys()]
    const subjects = await supabaseQuery<any>('subjects', {
      query: `id=in.(${subjectIds.join(',')})&select=id,code,name`,
    })
    const subjByid = new Map(subjects.map((s: any) => [s.id, s]))

    const lines = ['Attendance summary per subject:']
    for (const [subjectId, stats] of bySubject) {
      const subj = subjByid.get(subjectId)
      const label = subj ? `${subj.code} ${subj.name}` : subjectId
      const pct = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0.0'
      lines.push(`  - ${label}: ${stats.present}/${stats.total} classes present (${pct}%)`)
    }
    return lines.join('\n')
  } catch (err) {
    console.error('get_my_attendance failed:', err)
    return 'Error: could not fetch attendance data.'
  }
}

async function execGetMyFees(ctx: ToolContext): Promise<string> {
  try {
    const fees = await supabaseQuery<any>('fees', {
      query: `studentId=eq.${ctx.userId}&select=amount,paid,status,semester,dueDate&order=semester.desc`,
    })
    if (fees.length === 0) return 'No fee records found for this student yet.'

    const lines = ['Fee records:']
    let totalDue = 0
    let totalPaid = 0
    for (const f of fees) {
      const amt = Number(f.amount) || 0
      const paid = f.paid ? amt : 0
      totalDue += amt
      totalPaid += paid
      lines.push(`  - Semester ${f.semester}: PKR ${amt.toLocaleString()} — ${f.status || (f.paid ? 'PAID' : 'PENDING')}${f.dueDate ? ` (due ${new Date(f.dueDate).toLocaleDateString()})` : ''}`)
    }
    lines.push(`\nTotal charged: PKR ${totalDue.toLocaleString()}`)
    lines.push(`Total paid: PKR ${totalPaid.toLocaleString()}`)
    lines.push(`Outstanding: PKR ${(totalDue - totalPaid).toLocaleString()}`)
    return lines.join('\n')
  } catch (err) {
    console.error('get_my_fees failed:', err)
    return 'Error: could not fetch fee data.'
  }
}

async function execGetMySubjects(ctx: ToolContext): Promise<string> {
  try {
    const enrollments = await supabaseQuery<any>('enrollments', {
      query: `studentId=eq.${ctx.userId}&select=subjectId`,
    })
    const subjectIds = enrollments.map((e: any) => e.subjectId)
    if (subjectIds.length === 0) return 'The student is not enrolled in any subjects yet.'

    const subjects = await supabaseQuery<any>('subjects', {
      query: `id=in.(${subjectIds.join(',')})&select=id,code,name,credits,semester,department`,
    })

    // Also fetch teachers for each subject
    const teacherAssignments = await supabaseQuery<any>('subject_teachers', {
      query: `subjectId=in.(${subjectIds.join(',')})&select=subjectId,teacherId`,
    })
    const teacherIds = [...new Set(teacherAssignments.map((t: any) => t.teacherId))]
    const teachers = teacherIds.length
      ? await supabaseQuery<any>('users', { query: `id=in.(${teacherIds.join(',')})&select=id,name` })
      : []
    const teacherByid = new Map(teachers.map((t: any) => [t.id, t.name]))

    const teachersBySubject = new Map<string, string[]>()
    for (const ta of teacherAssignments) {
      const name = teacherByid.get(ta.teacherId)
      if (!name) continue
      if (!teachersBySubject.has(ta.subjectId)) teachersBySubject.set(ta.subjectId, [])
      teachersBySubject.get(ta.subjectId)!.push(name)
    }

    const lines = [`Enrolled in ${subjects.length} subject${subjects.length === 1 ? '' : 's'}:`]
    for (const s of subjects) {
      const t = teachersBySubject.get(s.id)
      const teacherPart = t && t.length ? ` — taught by ${t.join(', ')}` : ''
      lines.push(`  - ${s.code} ${s.name} [Sem ${s.semester ?? '?'}, ${s.credits} cr]${teacherPart}`)
    }
    return lines.join('\n')
  } catch (err) {
    console.error('get_my_subjects failed:', err)
    return 'Error: could not fetch enrolled subjects.'
  }
}

async function execGetMyUpcomingExams(ctx: ToolContext): Promise<string> {
  try {
    const enrollments = await supabaseQuery<any>('enrollments', {
      query: `studentId=eq.${ctx.userId}&select=subjectId`,
    })
    const subjectIds = enrollments.map((e: any) => e.subjectId)
    if (subjectIds.length === 0) return 'The student is not enrolled in any subjects yet.'

    const nowIso = new Date().toISOString()
    const exams = await supabaseQuery<any>('exams', {
      query: `subjectId=in.(${subjectIds.join(',')})&examDate=gte.${nowIso}&order=examDate.asc&select=id,subjectId,title,type,totalMarks,examDate`,
    })
    if (exams.length === 0) return 'No upcoming exams scheduled in the current student\'s subjects.'

    const subjects = await supabaseQuery<any>('subjects', {
      query: `id=in.(${subjectIds.join(',')})&select=id,code,name`,
    })
    const subjByid = new Map(subjects.map((s: any) => [s.id, s]))

    const lines = ['Upcoming exams:']
    for (const e of exams.slice(0, 10)) {
      const s = subjByid.get(e.subjectId)
      const label = s ? `${s.code} ${s.name}` : e.subjectId
      lines.push(`  - ${e.title} (${e.type}) — ${label} — ${new Date(e.examDate).toLocaleDateString()} — ${Number(e.totalMarks)} marks`)
    }
    return lines.join('\n')
  } catch (err) {
    console.error('get_my_upcoming_exams failed:', err)
    return 'Error: could not fetch upcoming exams.'
  }
}

async function execGetRecentAnnouncements(): Promise<string> {
  try {
    const announcements = await supabaseQuery<any>('announcements', {
      query: 'isPublished=eq.true&order=createdAt.desc&limit=5&select=title,category,createdAt,content',
    })
    if (announcements.length === 0) return 'No announcements available right now.'
    const lines = ['Recent announcements:']
    for (const a of announcements) {
      const date = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''
      const preview = String(a.content || '').slice(0, 150).replace(/\s+/g, ' ')
      lines.push(`  - [${a.category || 'GENERAL'}] ${a.title} (${date})${preview ? ' — ' + preview : ''}`)
    }
    return lines.join('\n')
  } catch (err) {
    console.error('get_recent_announcements failed:', err)
    return 'Error: could not fetch announcements.'
  }
}

async function execGetMyTeachingLoad(ctx: ToolContext): Promise<string> {
  try {
    const assignments = await supabaseQuery<any>('subject_teachers', {
      query: `teacherId=eq.${ctx.userId}&select=subjectId`,
    })
    const subjectIds = assignments.map((a: any) => a.subjectId)
    if (subjectIds.length === 0) return 'This teacher is not currently assigned to any subjects.'

    const [subjects, enrollments] = await Promise.all([
      supabaseQuery<any>('subjects', {
        query: `id=in.(${subjectIds.join(',')})&select=id,code,name,credits,semester,department`,
      }),
      supabaseQuery<any>('enrollments', {
        query: `subjectId=in.(${subjectIds.join(',')})&select=subjectId`,
      }),
    ])

    const enrollmentBySubject = new Map<string, number>()
    for (const e of enrollments) {
      enrollmentBySubject.set(e.subjectId, (enrollmentBySubject.get(e.subjectId) || 0) + 1)
    }

    const lines = [`Teaching ${subjects.length} subject${subjects.length === 1 ? '' : 's'}:`]
    for (const s of subjects) {
      const count = enrollmentBySubject.get(s.id) || 0
      lines.push(`  - ${s.code} ${s.name} [Sem ${s.semester ?? '?'}, ${s.credits} cr] — ${count} student${count === 1 ? '' : 's'} enrolled`)
    }
    return lines.join('\n')
  } catch (err) {
    console.error('get_my_teaching_load failed:', err)
    return 'Error: could not fetch teaching load.'
  }
}

async function execGetUniversityStats(): Promise<string> {
  try {
    const [students, teachers, subjects, admissions, unreadMsgs] = await Promise.all([
      supabaseQuery<any>('users', { query: 'role=eq.STUDENT&select=id' }),
      supabaseQuery<any>('users', { query: 'role=eq.TEACHER&select=id' }),
      supabaseQuery<any>('subjects', { query: 'select=id' }),
      supabaseQuery<any>('admissions', { query: 'status=eq.PENDING&select=id' }),
      supabaseQuery<any>('contact_messages', { query: 'isRead=eq.false&select=id' }).catch(() => []),
    ])
    return [
      'University statistics:',
      `  - Total students: ${students.length}`,
      `  - Total teachers: ${teachers.length}`,
      `  - Total subjects: ${subjects.length}`,
      `  - Pending admission applications: ${admissions.length}`,
      `  - Unread contact messages: ${unreadMsgs.length}`,
    ].join('\n')
  } catch (err) {
    console.error('get_university_stats failed:', err)
    return 'Error: could not fetch university statistics.'
  }
}

// ─── Central dispatcher ────────────────────────────────────
export async function executeTool(
  name: string,
  ctx: ToolContext,
): Promise<string> {
  // Role-based access enforcement (defense in depth — LLM only sees
  // role-appropriate tools, but we double-check here).
  const allowedNames = new Set(toolsForRole(ctx.role).map(t => t.function.name))
  if (!allowedNames.has(name)) {
    return `Error: you don't have permission to call ${name}.`
  }

  switch (name) {
    case 'get_my_transcript':          return execGetMyTranscript(ctx)
    case 'get_my_attendance':          return execGetMyAttendance(ctx)
    case 'get_my_fees':                return execGetMyFees(ctx)
    case 'get_my_subjects':            return execGetMySubjects(ctx)
    case 'get_my_upcoming_exams':      return execGetMyUpcomingExams(ctx)
    case 'get_my_teaching_load':       return execGetMyTeachingLoad(ctx)
    case 'get_recent_announcements':   return execGetRecentAnnouncements()
    case 'get_university_stats':       return execGetUniversityStats()
    default:                           return `Error: unknown tool ${name}.`
  }
}
