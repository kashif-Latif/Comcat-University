import { NextRequest, NextResponse } from 'next/server'
import { supabaseQuery } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// ─── Seed endpoint ─────────────────────────────────────────
// SECURED: requires a matching SEED_TOKEN header. Set SEED_TOKEN
// in your Vercel env vars. Rotate or unset after you're done seeding.
// Delete this file entirely for a truly locked-down production deploy.

function checkToken(req: NextRequest): NextResponse | null {
  const expected = process.env.SEED_TOKEN
  if (!expected) {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled (SEED_TOKEN not set).' },
      { status: 503 }
    )
  }
  const provided = req.headers.get('x-seed-token')
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const forbidden = checkToken(req)
  if (forbidden) return forbidden
  return runSeed()
}

export async function POST(req: NextRequest) {
  const forbidden = checkToken(req)
  if (forbidden) return forbidden
  return runSeed()
}

async function runSeed() {
  try {
    const results: Record<string, unknown> = {}

    // ─── 1. Create Admin ───
    const adminEmail = 'admin@comcat.edu.pk'
    const adminExists = await supabaseQuery('users', {
      query: `email=eq.${encodeURIComponent(adminEmail)}&select=id&limit=1`,
    }).catch(() => [])

    if (Array.isArray(adminExists) && adminExists.length === 0) {
      const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@Admin1!', 12)
      await supabaseQuery('users', {
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
      results.admin = 'Created'
    } else {
      results.admin = 'Already exists'
    }

    // ─── 2. Teachers ───
    const teachers = [
      { name: 'Dr. Ahmed Hassan', email: 'ahmed.hassan@comcat.edu.pk', department: 'Computer Science', designation: 'Professor', qualification: 'PhD Computer Science', teacherId: 'TC-001' },
      { name: 'Dr. Fatima Noor', email: 'fatima.noor@comcat.edu.pk', department: 'Information Technology', designation: 'Associate Professor', qualification: 'PhD IT', teacherId: 'TC-002' },
      { name: 'Prof. Ali Raza', email: 'ali.raza@comcat.edu.pk', department: 'Computer Science', designation: 'Assistant Professor', qualification: 'MS Computer Science', teacherId: 'TC-003' },
      { name: 'Dr. Sara Khan', email: 'sara.khan@comcat.edu.pk', department: 'Software Engineering', designation: 'Professor', qualification: 'PhD Software Engineering', teacherId: 'TC-004' },
      { name: 'Prof. Imran Malik', email: 'imran.malik@comcat.edu.pk', department: 'Data Science', designation: 'Associate Professor', qualification: 'MS Data Science', teacherId: 'TC-005' },
      { name: 'Dr. Zainab Shah', email: 'zainab.shah@comcat.edu.pk', department: 'Cyber Security', designation: 'Professor', qualification: 'PhD Cyber Security', teacherId: 'TC-006' },
    ]

    const teacherPassword = await bcrypt.hash(process.env.SEED_TEACHER_PASSWORD || 'ChangeMe@Teacher1!', 12)
    let createdT = 0, existingT = 0
    for (const t of teachers) {
      const exists = await supabaseQuery('users', {
        query: `email=eq.${encodeURIComponent(t.email)}&select=id&limit=1`,
      }).catch(() => [])
      if (Array.isArray(exists) && exists.length === 0) {
        await supabaseQuery('users', {
          method: 'POST',
          body: {
            email: t.email,
            password: teacherPassword,
            name: t.name,
            role: 'TEACHER',
            department: t.department,
            designation: t.designation,
            qualification: t.qualification,
            teacherId: t.teacherId,
          },
        })
        createdT++
      } else existingT++
    }
    results.teachers = { created: createdT, existing: existingT }

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
