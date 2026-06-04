import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const TEACHER_FIELDS = "id,email,name,role,phone,department,teacherId,designation,qualification,createdAt"

// GET /api/teachers - List all teachers (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const teachers = await supabaseQuery<any>("users", {
      query: `role=eq.TEACHER&select=${TEACHER_FIELDS}&order=createdAt.desc`,
    })

    // Enrich with subject assignment counts
    const enriched = await Promise.all(
      teachers.map(async (t: any) => {
        const assignments = await supabaseQuery<any>("subject_teachers", {
          query: `teacherId=eq.${t.id}&select=id`,
        })
        return {
          ...t,
          _count: {
            teacherSubjects: assignments.length,
          },
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching teachers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/teachers - Create a teacher (admin only)
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
    const { email, password, name, phone, department, teacherId, designation, qualification } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }

    const existing = await supabaseQuery<any>("users", {
      query: `email=eq.${encodeURIComponent(email)}`,
    })
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    if (teacherId) {
      const existingId = await supabaseQuery<any>("users", {
        query: `teacherId=eq.${encodeURIComponent(teacherId)}`,
      })
      if (existingId.length > 0) {
        return NextResponse.json({ error: "Teacher ID already exists" }, { status: 409 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const created = await supabaseQuery<any>("users", {
      method: "POST",
      body: {
        email,
        password: hashedPassword,
        name,
        role: "TEACHER",
        phone,
        department,
        teacherId,
        designation,
        qualification,
      },
    })

    // Return only selected fields (exclude password)
    const teacher = created[0]
    const { password: _pw, ...teacherWithoutPassword } = teacher

    return NextResponse.json(teacherWithoutPassword, { status: 201 })
  } catch (error) {
    console.error("Error creating teacher:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/teachers - Update a teacher (admin only)
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
    const { id, email, name, phone, department, teacherId, designation, qualification, password } = body

    if (!id) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (email) updateData.email = email
    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (department !== undefined) updateData.department = department
    if (teacherId !== undefined) updateData.teacherId = teacherId
    if (designation !== undefined) updateData.designation = designation
    if (qualification !== undefined) updateData.qualification = qualification
    if (password) updateData.password = await bcrypt.hash(password, 12)

    const updated = await supabaseQuery<any>("users", {
      method: "PATCH",
      query: `id=eq.${id}&select=${TEACHER_FIELDS}`,
      body: updateData,
    })

    const teacher = updated[0]
    const { password: _pw, ...teacherWithoutPassword } = teacher

    return NextResponse.json(teacherWithoutPassword)
  } catch (error) {
    console.error("Error updating teacher:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/teachers - Delete a teacher (admin only)
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
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    await supabaseQuery("users", {
      method: "DELETE",
      query: `id=eq.${id}`,
    })

    return NextResponse.json({ message: "Teacher deleted successfully" })
  } catch (error) {
    console.error("Error deleting teacher:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
