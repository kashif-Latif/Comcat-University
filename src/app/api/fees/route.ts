import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/fees - Get fee records
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as Record<string, unknown>).role as string
    const userId = (session.user as Record<string, unknown>).id as string
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")

    const filters: string[] = []

    // Students only see their own fees
    if (role === "STUDENT") {
      filters.push(`studentId=eq.${userId}`)
    } else if (role === "TEACHER") {
      return NextResponse.json({ error: "Teachers cannot access fee records" }, { status: 403 })
    }

    if (studentId && role === "ADMIN") {
      filters.push(`studentId=eq.${studentId}`)
    }

    // Add ordering
    filters.push("order=createdAt.desc")

    const query = filters.join("&")
    const fees = await supabaseQuery<any>("fees", { query })

    // Enrich with student data
    const enriched = await Promise.all(
      fees.map(async (f: any) => {
        const students = await supabaseQuery<any>("users", {
          query: `id=eq.${f.studentId}&select=id,name,studentId,department`,
        })
        return {
          ...f,
          student: students[0] || { id: f.studentId, name: 'Unknown', studentId: null, department: null },
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching fees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/fees - Create fee record (admin only)
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
    const { studentId, semester, amount, status, dueDate, description } = body

    if (!studentId || !amount || !semester) {
      return NextResponse.json({ error: "Student ID, amount, and semester are required" }, { status: 400 })
    }

    const fee = await supabaseQuery<any>("fees", {
      method: "POST",
      body: {
        studentId,
        semester,
        amount: parseFloat(amount),
        status: status || "PENDING",
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        description,
      },
    })

    return NextResponse.json(fee[0], { status: 201 })
  } catch (error) {
    console.error("Error creating fee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/fees - Update fee record (admin only)
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
    const { id, status, paidAmount, paidDate } = body

    if (!id) {
      return NextResponse.json({ error: "Fee ID is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount)
    if (paidDate) updateData.paidDate = new Date(paidDate).toISOString()

    const fee = await supabaseQuery<any>("fees", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: updateData,
    })

    return NextResponse.json(fee[0] || {})
  } catch (error) {
    console.error("Error updating fee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
