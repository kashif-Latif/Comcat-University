import { supabaseQuery } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

// ─── GET: Fetch all admissions (admin use) ─────────────────
// Supports ?status=PENDING, ?status=ACCEPTED, etc.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get("status")

    const filters: string[] = ["order=createdAt.desc"]
    if (status) {
      filters.push(`status=eq.${status}`)
    }

    const admissions = await supabaseQuery<any>("admissions", {
      query: filters.join("&"),
    })

    return NextResponse.json(admissions)
  } catch (error) {
    console.error("Error fetching admissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch admissions" },
      { status: 500 }
    )
  }
}

// ─── POST: Create new admission application ─────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      cnic,
      dateOfBirth,
      gender,
      program,
      previousDegree,
      previousInstitution,
      previousGPA,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !gender || !program) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, email, phone, gender, program" },
        { status: 400 }
      )
    }

    // Check for duplicate email (same person applying twice)
    const existing = await supabaseQuery<any>("admissions", {
      query: `email=eq.${encodeURIComponent(email.trim().toLowerCase())}`,
    })

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An application with this email already exists" },
        { status: 409 }
      )
    }

    const created = await supabaseQuery<any>("admissions", {
      method: "POST",
      body: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        cnic: cnic?.trim() || null,
        dateOfBirth: dateOfBirth || null,
        gender,
        program,
        previousDegree: previousDegree?.trim() || null,
        previousInstitution: previousInstitution?.trim() || null,
        previousGPA: previousGPA?.trim() || null,
        status: "PENDING",
      },
    })

    const admission = created[0]

    // TODO: Send confirmation email to applicant
    // TODO: Notify admissions team about new application

    return NextResponse.json(
      {
        success: true,
        admission: {
          id: admission.id,
          firstName: admission.firstName,
          lastName: admission.lastName,
          email: admission.email,
          program: admission.program,
          status: admission.status,
          createdAt: admission.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating admission:", error)
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    )
  }
}

// ─── PUT: Update admission status (accept/reject) ───────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "Admission ID and status are required" },
        { status: 400 }
      )
    }

    const validStatuses = ["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const updated = await supabaseQuery<any>("admissions", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: { status },
    })

    return NextResponse.json(updated[0] || {})
  } catch (error) {
    console.error("Error updating admission:", error)
    return NextResponse.json(
      { error: "Failed to update admission" },
      { status: 500 }
    )
  }
}

// ─── DELETE: Delete an admission application ─────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Admission ID is required" },
        { status: 400 }
      )
    }

    await supabaseQuery("admissions", {
      method: "DELETE",
      query: `id=eq.${id}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admission:", error)
    return NextResponse.json(
      { error: "Failed to delete admission" },
      { status: 500 }
    )
  }
}
