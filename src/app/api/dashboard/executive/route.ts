import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { requireRole } from "@/lib/api-guard"

// GET /api/dashboard/executive
// Returns a rich KPI + chart payload.
//   - VC   → whole-university stats
//   - HOD  → same shape but scoped to their `department`
//   - ADMIN also allowed (for testing / oversight)
export async function GET(_req: NextRequest) {
  const guard = await requireRole(['VC' as any, 'HOD' as any, 'ADMIN'])
  if ('error' in guard) return guard.error

  const user = guard.session!.user as Record<string, unknown>
  const role = String(user.role || '').toUpperCase()
  const department = user.department ? String(user.department) : null

  // For HOD, we scope everything to their department. VC/ADMIN get everything.
  const scoped = role === 'HOD'
  if (scoped && !department) {
    return NextResponse.json(
      { error: 'HOD account has no department set. Assign one via admin.' },
      { status: 400 }
    )
  }

  try {
    // ─── Fetch base data once, then reduce in-memory ────────
    const [
      studentsRaw,
      teachersRaw,
      subjectsRaw,
      admissionsRaw,
      feesRaw,
      announcementsRaw,
      enrollmentsRaw,
    ] = await Promise.all([
      supabaseQuery<any>('users', {
        query: `role=eq.STUDENT&select=id,name,department,semester,createdAt`,
      }),
      supabaseQuery<any>('users', {
        query: `role=eq.TEACHER&select=id,name,department,designation,createdAt`,
      }),
      supabaseQuery<any>('subjects', {
        query: `select=id,code,name,department,credits,semester`,
      }),
      supabaseQuery<any>('admissions', {
        query: `order=createdAt.desc&select=id,firstName,lastName,program,status,createdAt`,
      }),
      supabaseQuery<any>('fees', {
        query: `select=studentId,amount,status,semester`,
      }),
      supabaseQuery<any>('announcements', {
        query: `isPublished=eq.true&order=createdAt.desc&limit=5&select=id,title,category,createdAt`,
      }),
      supabaseQuery<any>('enrollments', {
        query: `select=studentId,subjectId`,
      }),
    ])

    // ─── Department-scope filter for HOD ────────────────────
    const inDept = <T extends { department?: string | null }>(row: T) =>
      !scoped || (row.department && String(row.department).toLowerCase() === String(department).toLowerCase())

    const students   = studentsRaw.filter(inDept)
    const teachers   = teachersRaw.filter(inDept)
    const subjects   = subjectsRaw.filter(inDept)

    // Admissions don't have a "department" — they have `program` (course name).
    // For HOD scoping we filter admissions whose program matches the department name.
    const admissions = scoped
      ? admissionsRaw.filter((a: any) => a.program && String(a.program).toLowerCase().includes(String(department).toLowerCase()))
      : admissionsRaw

    // Fees are scoped by joining through students in this dept
    const studentIdSet = new Set(students.map((s: any) => s.id))
    const fees = scoped ? feesRaw.filter((f: any) => studentIdSet.has(f.studentId)) : feesRaw

    // Enrollments scoped by subjects in the dept
    const subjectIdSet = new Set(subjects.map((s: any) => s.id))
    const enrollments = scoped ? enrollmentsRaw.filter((e: any) => subjectIdSet.has(e.subjectId)) : enrollmentsRaw

    // Announcements: no department field, VC/HOD see all recent published
    const announcements = announcementsRaw

    // ─── KPIs ─────────────────────────────────────────────
    const totalRevenue = fees
      .filter((f: any) => String(f.status).toUpperCase() === 'PAID')
      .reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0)

    const totalOutstanding = fees
      .filter((f: any) => String(f.status).toUpperCase() !== 'PAID')
      .reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0)

    const admissionsByStatus: Record<string, number> = {}
    for (const a of admissions) {
      const st = String(a.status || 'PENDING').toUpperCase()
      admissionsByStatus[st] = (admissionsByStatus[st] || 0) + 1
    }
    const pendingAdmissions = admissionsByStatus['PENDING'] || 0

    const kpis = {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalSubjects: subjects.length,
      totalDepartments: new Set(students.map((s: any) => s.department).filter(Boolean)).size,
      pendingAdmissions,
      totalEnrollments: enrollments.length,
      revenuePaid: totalRevenue,
      revenueOutstanding: totalOutstanding,
    }

    // ─── Chart data ──────────────────────────────────────
    // Students by department (VC sees many, HOD sees just theirs — chart still fine)
    const studentsByDeptMap = new Map<string, number>()
    for (const s of students) {
      const key = s.department || 'Unassigned'
      studentsByDeptMap.set(key, (studentsByDeptMap.get(key) || 0) + 1)
    }
    const studentsByDept = [...studentsByDeptMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Teachers by department
    const teachersByDeptMap = new Map<string, number>()
    for (const t of teachers) {
      const key = t.department || 'Unassigned'
      teachersByDeptMap.set(key, (teachersByDeptMap.get(key) || 0) + 1)
    }
    const teachersByDept = [...teachersByDeptMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Students by semester
    const studentsBySemMap = new Map<number, number>()
    for (const s of students) {
      const sem = Number(s.semester) || 0
      studentsBySemMap.set(sem, (studentsBySemMap.get(sem) || 0) + 1)
    }
    const studentsBySemester = [...studentsBySemMap.entries()]
      .map(([semester, count]) => ({ semester: `Sem ${semester}`, count }))
      .sort((a, b) => Number(a.semester.split(' ')[1]) - Number(b.semester.split(' ')[1]))

    // Admission funnel
    const admissionFunnel = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].map(status => ({
      name: status.replace('_', ' '),
      value: admissionsByStatus[status] || 0,
    }))

    // Revenue over time (grouped by semester)
    const revenueBySemMap = new Map<number, { paid: number; pending: number }>()
    for (const f of fees) {
      const sem = Number(f.semester) || 0
      if (!revenueBySemMap.has(sem)) revenueBySemMap.set(sem, { paid: 0, pending: 0 })
      const bucket = revenueBySemMap.get(sem)!
      const amt = Number(f.amount) || 0
      if (String(f.status).toUpperCase() === 'PAID') bucket.paid += amt
      else bucket.pending += amt
    }
    const revenueBySemester = [...revenueBySemMap.entries()]
      .map(([semester, v]) => ({ semester: `Sem ${semester}`, paid: v.paid, pending: v.pending }))
      .sort((a, b) => Number(a.semester.split(' ')[1]) - Number(b.semester.split(' ')[1]))

    // ─── Recent lists ────────────────────────────────────
    const recentAdmissions = admissions.slice(0, 5).map((a: any) => ({
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      program: a.program,
      status: a.status,
      appliedAt: a.createdAt,
    }))

    return NextResponse.json({
      role,
      department: scoped ? department : null,
      kpis,
      charts: {
        studentsByDept,
        teachersByDept,
        studentsBySemester,
        admissionFunnel,
        revenueBySemester,
      },
      recentAdmissions,
      recentAnnouncements: announcements,
    })
  } catch (err) {
    console.error('Executive dashboard error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
