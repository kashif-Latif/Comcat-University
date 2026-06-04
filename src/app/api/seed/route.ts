import { NextResponse } from 'next/server'
import { supabaseQuery } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// GET /api/seed — Seed the database with admin, teachers, students, and subjects
export async function GET() {
  try {
    const results: Record<string, unknown> = {}

    // ─── 1. Create Admin ───
    const adminEmail = 'kashif.latif2004@gmail.com'
    const adminExists = await supabaseQuery('users', {
      query: `email=eq.${encodeURIComponent(adminEmail)}&select=id&limit=1`,
    }).catch(() => [])

    if (Array.isArray(adminExists) && adminExists.length === 0) {
      const adminHash = await bcrypt.hash('Comcat@Admin2024', 12)
      const admin = await supabaseQuery('users', {
        method: 'POST',
        body: {
          email: adminEmail,
          password: adminHash,
          name: 'Muhammad Kashif Latif',
          role: 'ADMIN',
          phone: '+92-300-0000001',
          department: 'Administration',
        },
      })
      results.admin = 'Created successfully'
      console.log('Admin created:', admin)
    } else {
      results.admin = 'Already exists'
    }

    // ─── 2. Create Teachers ───
    const teachers = [
      { name: 'Dr. Ahmed Hassan', email: 'ahmed.hassan@comcat.edu.pk', department: 'Computer Science', designation: 'Professor', qualification: 'PhD Computer Science', teacherId: 'TC-001' },
      { name: 'Dr. Fatima Noor', email: 'fatima.noor@comcat.edu.pk', department: 'Information Technology', designation: 'Associate Professor', qualification: 'PhD IT', teacherId: 'TC-002' },
      { name: 'Prof. Ali Raza', email: 'ali.raza@comcat.edu.pk', department: 'Computer Science', designation: 'Assistant Professor', qualification: 'MS Computer Science', teacherId: 'TC-003' },
      { name: 'Dr. Sara Khan', email: 'sara.khan@comcat.edu.pk', department: 'Software Engineering', designation: 'Professor', qualification: 'PhD Software Engineering', teacherId: 'TC-004' },
      { name: 'Prof. Imran Malik', email: 'imran.malik@comcat.edu.pk', department: 'Data Science', designation: 'Associate Professor', qualification: 'MS Data Science', teacherId: 'TC-005' },
      { name: 'Dr. Zainab Shah', email: 'zainab.shah@comcat.edu.pk', department: 'Cyber Security', designation: 'Professor', qualification: 'PhD Cyber Security', teacherId: 'TC-006' },
      { name: 'Prof. Bilal Ahmed', email: 'bilal.ahmed@comcat.edu.pk', department: 'Computer Science', designation: 'Lecturer', qualification: 'MS Computer Science', teacherId: 'TC-007' },
      { name: 'Dr. Hina Siddiqui', email: 'hina.siddiqui@comcat.edu.pk', department: 'Information Technology', designation: 'Associate Professor', qualification: 'PhD IT', teacherId: 'TC-008' },
      { name: 'Prof. Umar Farooq', email: 'umar.farooq@comcat.edu.pk', department: 'Software Engineering', designation: 'Assistant Professor', qualification: 'MS Software Engineering', teacherId: 'TC-009' },
      { name: 'Dr. Nadia Ashraf', email: 'nadia.ashraf@comcat.edu.pk', department: 'Data Science', designation: 'Professor', qualification: 'PhD Data Science', teacherId: 'TC-010' },
    ]

    const teacherPassword = await bcrypt.hash('Teacher@2024', 12)
    let createdTeachers = 0
    let existingTeachers = 0

    for (const t of teachers) {
      const exists = await supabaseQuery('users', {
        query: `email=eq.${encodeURIComponent(t.email)}&select=id&limit=1`,
      }).catch(() => [])

      if (Array.isArray(exists) && exists.length === 0) {
        await supabaseQuery('users', {
          method: 'POST',
          body: { ...t, password: teacherPassword, role: 'TEACHER' },
        }).catch((e) => console.error(`Failed to create teacher ${t.email}:`, e))
        createdTeachers++
      } else {
        existingTeachers++
      }
    }
    results.teachers = { created: createdTeachers, alreadyExisted: existingTeachers }

    // ─── 3. Create Students ───
    const students = [
      { name: 'Ahmed Ali', email: 'ahmed.ali@student.comcat.edu.pk', department: 'Computer Science', semester: 4, studentId: 'STU-2024-001', enrollmentYear: 2024 },
      { name: 'Sara Ahmed', email: 'sara.ahmed@student.comcat.edu.pk', department: 'Information Technology', semester: 2, studentId: 'STU-2024-002', enrollmentYear: 2024 },
      { name: 'Muhammad Usman', email: 'muhammad.usman@student.comcat.edu.pk', department: 'Computer Science', semester: 6, studentId: 'STU-2023-003', enrollmentYear: 2023 },
      { name: 'Ayesha Khan', email: 'ayesha.khan@student.comcat.edu.pk', department: 'Software Engineering', semester: 4, studentId: 'STU-2024-004', enrollmentYear: 2024 },
      { name: 'Hassan Raza', email: 'hassan.raza@student.comcat.edu.pk', department: 'Data Science', semester: 2, studentId: 'STU-2024-005', enrollmentYear: 2024 },
      { name: 'Zainab Ali', email: 'zainab.ali@student.comcat.edu.pk', department: 'Computer Science', semester: 6, studentId: 'STU-2023-006', enrollmentYear: 2023 },
      { name: 'Bilal Siddiqui', email: 'bilal.siddiqui@student.comcat.edu.pk', department: 'Cyber Security', semester: 4, studentId: 'STU-2024-007', enrollmentYear: 2024 },
      { name: 'Maryam Noor', email: 'maryam.noor@student.comcat.edu.pk', department: 'Information Technology', semester: 2, studentId: 'STU-2024-008', enrollmentYear: 2024 },
      { name: 'Farhan Malik', email: 'farhan.malik@student.comcat.edu.pk', department: 'Software Engineering', semester: 8, studentId: 'STU-2022-009', enrollmentYear: 2022 },
      { name: 'Hina Fatima', email: 'hina.fatima@student.comcat.edu.pk', department: 'Data Science', semester: 4, studentId: 'STU-2024-010', enrollmentYear: 2024 },
      { name: 'Talha Imran', email: 'talha.imran@student.comcat.edu.pk', department: 'Computer Science', semester: 6, studentId: 'STU-2023-011', enrollmentYear: 2023 },
      { name: 'Sana Raza', email: 'sana.raza@student.comcat.edu.pk', department: 'Information Technology', semester: 4, studentId: 'STU-2024-012', enrollmentYear: 2024 },
      { name: 'Kashif Hussain', email: 'kashif.hussain@student.comcat.edu.pk', department: 'Software Engineering', semester: 2, studentId: 'STU-2024-013', enrollmentYear: 2024 },
      { name: 'Nadia Pervez', email: 'nadia.pervez@student.comcat.edu.pk', department: 'Computer Science', semester: 8, studentId: 'STU-2022-014', enrollmentYear: 2022 },
      { name: 'Waqar Ahmed', email: 'waqar.ahmed@student.comcat.edu.pk', department: 'Cyber Security', semester: 6, studentId: 'STU-2023-015', enrollmentYear: 2023 },
      { name: 'Ammar Shah', email: 'ammar.shah@student.comcat.edu.pk', department: 'Data Science', semester: 4, studentId: 'STU-2024-016', enrollmentYear: 2024 },
      { name: 'Sobia Tariq', email: 'sobia.tariq@student.comcat.edu.pk', department: 'Computer Science', semester: 2, studentId: 'STU-2024-017', enrollmentYear: 2024 },
      { name: 'Asad Ali', email: 'asad.ali@student.comcat.edu.pk', department: 'Information Technology', semester: 6, studentId: 'STU-2023-018', enrollmentYear: 2023 },
      { name: 'Rabia Sultan', email: 'rabia.sultan@student.comcat.edu.pk', department: 'Software Engineering', semester: 4, studentId: 'STU-2024-019', enrollmentYear: 2024 },
      { name: 'Junaid Khan', email: 'junaid.khan@student.comcat.edu.pk', department: 'Data Science', semester: 8, studentId: 'STU-2022-020', enrollmentYear: 2022 },
      { name: 'Umer Siddiqui', email: 'umer.siddiqui@student.comcat.edu.pk', department: 'Computer Science', semester: 4, studentId: 'STU-2024-021', enrollmentYear: 2024 },
      { name: 'Kiran Fatima', email: 'kiran.fatima@student.comcat.edu.pk', department: 'Cyber Security', semester: 2, studentId: 'STU-2024-022', enrollmentYear: 2024 },
      { name: 'Shahzad Ahmed', email: 'shahzad.ahmed@student.comcat.edu.pk', department: 'Software Engineering', semester: 6, studentId: 'STU-2023-023', enrollmentYear: 2023 },
      { name: 'Maham Raza', email: 'maham.raza@student.comcat.edu.pk', department: 'Information Technology', semester: 4, studentId: 'STU-2024-024', enrollmentYear: 2024 },
      { name: 'Faisal Malik', email: 'faisal.malik@student.comcat.edu.pk', department: 'Computer Science', semester: 8, studentId: 'STU-2022-025', enrollmentYear: 2022 },
      { name: 'Areeba Noor', email: 'areeba.noor@student.comcat.edu.pk', department: 'Data Science', semester: 2, studentId: 'STU-2024-026', enrollmentYear: 2024 },
      { name: 'Imran Hussain', email: 'imran.hussain@student.comcat.edu.pk', department: 'Cyber Security', semester: 6, studentId: 'STU-2023-027', enrollmentYear: 2023 },
      { name: 'Sania Ali', email: 'sania.ali@student.comcat.edu.pk', department: 'Software Engineering', semester: 4, studentId: 'STU-2024-028', enrollmentYear: 2024 },
      { name: 'Tahir Shah', email: 'tahir.shah@student.comcat.edu.pk', department: 'Computer Science', semester: 2, studentId: 'STU-2024-029', enrollmentYear: 2024 },
      { name: 'Nida Ashraf', email: 'nida.ashraf@student.comcat.edu.pk', department: 'Information Technology', semester: 8, studentId: 'STU-2022-030', enrollmentYear: 2022 },
      { name: 'Kamran Ahmed', email: 'kamran.ahmed@student.comcat.edu.pk', department: 'Data Science', semester: 4, studentId: 'STU-2024-031', enrollmentYear: 2024 },
      { name: 'Sidra Raza', email: 'sidra.raza@student.comcat.edu.pk', department: 'Computer Science', semester: 6, studentId: 'STU-2023-032', enrollmentYear: 2023 },
      { name: 'Zubair Khan', email: 'zubair.khan@student.comcat.edu.pk', department: 'Software Engineering', semester: 2, studentId: 'STU-2024-033', enrollmentYear: 2024 },
      { name: 'Farah Deeba', email: 'farah.deeba@student.comcat.edu.pk', department: 'Cyber Security', semester: 4, studentId: 'STU-2024-034', enrollmentYear: 2024 },
      { name: 'Rizwan Ahmed', email: 'rizwan.ahmed@student.comcat.edu.pk', department: 'Information Technology', semester: 6, studentId: 'STU-2023-035', enrollmentYear: 2023 },
    ]

    const studentPassword = await bcrypt.hash('Student@2024', 12)
    let createdStudents = 0
    let existingStudents = 0

    for (const s of students) {
      const exists = await supabaseQuery('users', {
        query: `email=eq.${encodeURIComponent(s.email)}&select=id&limit=1`,
      }).catch(() => [])

      if (Array.isArray(exists) && exists.length === 0) {
        await supabaseQuery('users', {
          method: 'POST',
          body: { ...s, password: studentPassword, role: 'STUDENT' },
        }).catch((e) => console.error(`Failed to create student ${s.email}:`, e))
        createdStudents++
      } else {
        existingStudents++
      }
    }
    results.students = { created: createdStudents, alreadyExisted: existingStudents }

    // ─── 4. Create Subjects ───
    const subjects = [
      { code: 'CS101', name: 'Introduction to Computer Science', description: 'Fundamentals of computing and programming', credits: 3, semester: 1, department: 'Computer Science' },
      { code: 'CS201', name: 'Data Structures & Algorithms', description: 'Arrays, linked lists, trees, graphs, sorting', credits: 4, semester: 3, department: 'Computer Science' },
      { code: 'CS301', name: 'Database Management Systems', description: 'SQL, normalization, ER diagrams, transactions', credits: 3, semester: 4, department: 'Computer Science' },
      { code: 'CS401', name: 'Operating Systems', description: 'Process management, memory, file systems', credits: 4, semester: 5, department: 'Computer Science' },
      { code: 'SE201', name: 'Software Engineering Fundamentals', description: 'SDLC, requirements, design patterns', credits: 3, semester: 3, department: 'Software Engineering' },
      { code: 'SE301', name: 'Web Development', description: 'Full-stack web development with modern frameworks', credits: 4, semester: 5, department: 'Software Engineering' },
      { code: 'IT101', name: 'Computer Networks', description: 'TCP/IP, OSI model, network security', credits: 3, semester: 2, department: 'Information Technology' },
      { code: 'IT201', name: 'Information Security', description: 'Cryptography, access control, security policies', credits: 3, semester: 4, department: 'Information Technology' },
      { code: 'DS301', name: 'Machine Learning', description: 'Supervised/unsupervised learning, neural networks', credits: 4, semester: 5, department: 'Data Science' },
      { code: 'DS401', name: 'Data Analytics & Visualization', description: 'Statistical analysis, data visualization tools', credits: 3, semester: 6, department: 'Data Science' },
      { code: 'CY101', name: 'Cyber Security Fundamentals', description: 'Threats, vulnerabilities, ethical hacking basics', credits: 3, semester: 1, department: 'Cyber Security' },
      { code: 'CY301', name: 'Digital Forensics', description: 'Evidence collection, analysis, incident response', credits: 3, semester: 5, department: 'Cyber Security' },
    ]

    let createdSubjects = 0
    let existingSubjects = 0

    for (const s of subjects) {
      const exists = await supabaseQuery('subjects', {
        query: `code=eq.${encodeURIComponent(s.code)}&select=id&limit=1`,
      }).catch(() => [])

      if (Array.isArray(exists) && exists.length === 0) {
        await supabaseQuery('subjects', { method: 'POST', body: s })
          .catch((e) => console.error(`Failed to create subject ${s.code}:`, e))
        createdSubjects++
      } else {
        existingSubjects++
      }
    }
    results.subjects = { created: createdSubjects, alreadyExisted: existingSubjects }

    // ─── 5. Create Announcements ───
    const announcements = [
      { title: 'Welcome to COMCAT University!', content: 'We are excited to welcome all new and returning students for the academic year 2024-2025. Classes begin next Monday.', category: 'GENERAL', isPublished: true },
      { title: 'Fall 2024 Admissions Open', content: 'Admissions are now open for all programs including CS, IT, SE, DS, and Cyber Security. Apply online through the admissions portal.', category: 'ADMISSION', isPublished: true },
      { title: 'Mid-Term Examination Schedule', content: 'Mid-term examinations will be held from November 15-25, 2024. Please check the exam portal for your individual schedule.', category: 'EXAM', isPublished: true },
      { title: 'Annual Sports Day', content: 'Annual Sports Day will be celebrated on December 10, 2024. All students and faculty are encouraged to participate.', category: 'EVENT', isPublished: true },
    ]

    let createdAnnouncements = 0
    for (const a of announcements) {
      try {
        await supabaseQuery('announcements', { method: 'POST', body: a })
        createdAnnouncements++
      } catch {
        // Skip if already exists or other error
      }
    }
    results.announcements = { created: createdAnnouncements }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      results,
      loginCredentials: {
        admin: { email: 'kashif.latif2004@gmail.com', password: 'Comcat@Admin2024' },
        teacher: { email: 'ahmed.hassan@comcat.edu.pk', password: 'Teacher@2024' },
        student: { email: 'ahmed.ali@student.comcat.edu.pk', password: 'Student@2024' },
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    const msg = error instanceof Error ? error.message : 'Seed failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
