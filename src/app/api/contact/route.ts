import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"

// GET /api/contact - Get contact messages
export async function GET() {
  try {
    const messages = await supabaseQuery<any>("contact_messages", {
      query: "order=createdAt.desc",
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching contact messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/contact - Submit contact form (public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const created = await supabaseQuery<any>("contact_messages", {
      method: "POST",
      body: { name, email, subject, message },
    })

    return NextResponse.json(created[0], { status: 201 })
  } catch (error) {
    console.error("Error creating contact message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/contact - Update contact message (mark as read, etc.)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, isRead } = body

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (isRead !== undefined) updateData.isRead = isRead

    const updated = await supabaseQuery<any>("contact_messages", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: updateData,
    })

    return NextResponse.json(updated[0] || {})
  } catch (error) {
    console.error("Error updating contact message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
