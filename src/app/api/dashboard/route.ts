import { NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/dashboard - Get dashboard stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    const userId = (session.user as Record<string, unknown>).id as string

    if (role === "ADMIN") {
      const [
        students,
        teachers,
        subjects,
        publishedAnnouncements,
        unreadMessages,
        recentAnnouncementsRaw,
      ] = await Promise.all([
        supabaseQuery<any>("users", { query: "role=eq.STUDENT&select=id" }),
        supabaseQuery<any>("users", { query: "role=eq.TEACHER&select=id" }),
        supabaseQuery<any>("subjects", { query: "select=id" }),
        supabaseQuery<any>("announcements", { query: "isPublished=eq.true&select=id" }),
        supabaseQuery<any>("contact_messages", { query: "isRead=eq.false&select=id" }),
        supabaseQuery<any>("announcements", { query: "isPublished=eq.true&order=createdAt.desc&limit=5&select=id,title,content,category,createdAt,authorId" }),
      ])

      const totalStudents = students.length
      const totalTeachers = teachers.length
      const totalSubjects = subjects.length
      const totalAnnouncements = publishedAnnouncements.length
      const unreadMessagesCount = unreadMessages.length

      // Enrich recent announcements with author names
      const recentAnnouncements = await Promise.all(
        recentAnnouncementsRaw.map(async (a: any) => {
          const authors = await supabaseQuery<any>("users", {
            query: `id=eq.${a.authorId}&select=name`,
          })
          return {
            ...a,
            author: { name: authors[0]?.name || "Unknown" },
          }
        })
      )

      // Department stats (manual groupBy)
      const allStudents = await supabaseQuery<any>("users", {
        query: "role=eq.STUDENT&select=department",
      })
      const deptMap: Record<string, number> = {}
      for (const s of allStudents) {
        if (s.department) {
          deptMap[s.department] = (deptMap[s.department] || 0) + 1
        }
      }
      const departmentStats = Object.entries(deptMap).map(([department, count]) => ({
        department,
        _count: { department: count },
      }))

      return NextResponse.json({
        totalStudents,
        totalTeachers,
        totalSubjects,
        totalAnnouncements,
        unreadMessages: unreadMessagesCount,
        recentAnnouncements,
        departmentStats,
      })
    }

    if (role === "TEACHER") {
      const [teacherUsers, teacherAssignments] = await Promise.all([
        supabaseQuery<any>("users", {
          query: `id=eq.${userId}&select=id,name,email,department,designation,qualification,teacherId`,
        }),
        supabaseQuery<any>("subject_teachers", {
          query: `teacherId=eq.${userId}&select=id,subjectId`,
        }),
      ])

      const teacher = teacherUsers[0]
      const subjectIds = teacherAssignments.map((ta) => ta.subjectId)

      let assignedSubjects: any[] = []
      if (subjectIds.length > 0) {
        const subjectPromises = subjectIds.map(async (sid) => {
          const subjects = await supabaseQuery<any>("subjects", {
            query: `id=eq.${sid}&select=*`,
          })
          if (subjects.length === 0) return null
          const s = subjects[0]
          const enrollments = await supabaseQuery<any>("enrollments", {
            query: `subjectId=eq.${sid}&select=id`,
          })
          return {
            ...s,
            enrollmentCount: enrollments.length,
          }
        })
        assignedSubjects = (await Promise.all(subjectPromises)).filter(Boolean)
      }

      let totalStudents = 0
      if (subjectIds.length > 0) {
        const enrollmentCounts = await Promise.all(
          subjectIds.map(async (sid) => {
            const enrollments = await supabaseQuery<any>("enrollments", {
              query: `subjectId=eq.${sid}&select=studentId`,
            })
            return enrollments.length
          })
        )
        totalStudents = enrollmentCounts.reduce((sum, c) => sum + c, 0)
      }

      return NextResponse.json({
        teacher: {
          id: teacher?.id,
          name: teacher?.name,
          email: teacher?.email,
          department: teacher?.department,
          designation: teacher?.designation,
          qualification: teacher?.qualification,
          teacherId: teacher?.teacherId,
        },
        assignedSubjects,
        totalStudents,
      })
    }

    if (role === "STUDENT") {
      const [studentUsers, enrollments, attendanceRecords, fees] = await Promise.all([
        supabaseQuery<any>("users", {
          query: `id=eq.${userId}&select=id,name,email,department,semester,studentId,enrollmentYear,phone,dateOfBirth`,
        }),
        supabaseQuery<any>("enrollments", {
          query: `studentId=eq.${userId}&select=id,subjectId,grade`,
        }),
        supabaseQuery<any>("attendance_records", {
          query: `studentId=eq.${userId}&select=id,status`,
        }),
        supabaseQuery<any>("fees", {
          query: `studentId=eq.${userId}&order=createdAt.desc`,
        }),
      ])

      const student = studentUsers[0]

      // Enrich enrollments with subject data
      const enrichedEnrollments = await Promise.all(
        enrollments.map(async (e: any) => {
          const subjects = await supabaseQuery<any>("subjects", {
            query: `id=eq.${e.subjectId}`,
          })
          return { ...e, subject: subjects[0] || null }
        })
      )

      const totalClasses = attendanceRecords.length
      const presentClasses = attendanceRecords.filter((a) => a.status === "PRESENT").length
      const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0

      return NextResponse.json({
        student: {
          id: student?.id,
          name: student?.name,
          email: student?.email,
          department: student?.department,
          semester: student?.semester,
          studentId: student?.studentId,
          enrollmentYear: student?.enrollmentYear,
          phone: student?.phone,
          dateOfBirth: student?.dateOfBirth,
        },
        enrollments: enrichedEnrollments
          .map((e) => e.subject)
          .filter(Boolean),
        attendanceStats: {
          totalClasses,
          presentClasses,
          absentClasses: attendanceRecords.filter((a) => a.status === "ABSENT").length,
          lateClasses: attendanceRecords.filter((a) => a.status === "LATE").length,
          attendancePercentage,
        },
        fees,
      })
    }

    return NextResponse.json({ error: "Unknown role" }, { status: 400 })
  } catch (error) {
    console.error("Error fetching dashboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
