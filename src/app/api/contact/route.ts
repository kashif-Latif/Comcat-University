import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { requireRole, rateLimit } from "@/lib/api-guard"

// GET /api/contact - Admin only (contains sender emails + messages = PII)
export async function GET() {
  const guard = await requireRole(['ADMIN'])
  if ('error' in guard) return guard.error

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

// POST /api/contact - Public, but rate-limited (10 messages/hour/IP)
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'contact:post', 10, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const body = await req.json()
    const { name, email, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    // Bound the payload to protect the DB
    if (String(message).length > 5000 || String(subject).length > 200) {
      return NextResponse.json({ error: "Message or subject too long" }, { status: 400 })
    }

    const created = await supabaseQuery<any>("contact_messages", {
      method: "POST",
      body: {
        name: String(name).slice(0, 100),
        email: String(email).slice(0, 200).toLowerCase(),
        subject: String(subject).slice(0, 200),
        message: String(message).slice(0, 5000),
      },
    })

    return NextResponse.json(created[0], { status: 201 })
  } catch (error) {
    console.error("Error creating contact message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/contact - Admin only (mark as read, etc.)
export async function PUT(req: NextRequest) {
  const guard = await requireRole(['ADMIN'])
  if ('error' in guard) return guard.error

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
