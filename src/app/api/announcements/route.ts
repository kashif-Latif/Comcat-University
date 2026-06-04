import { NextRequest, NextResponse } from "next/server"
import { supabaseQuery } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/announcements - Get announcements (public)
// Supports ?all=true to return all (including unpublished), ?category=GENERAL
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const all = searchParams.get("all")

    const filters: string[] = []

    if (all !== "true") {
      filters.push("isPublished=eq.true")
    }

    if (category) {
      filters.push(`category=eq.${category}`)
    }

    // Limit to 20 if no category filter
    if (!category) {
      filters.push("limit=20")
    }

    // Order by most recent
    filters.push("order=createdAt.desc")

    const query = filters.join("&")
    const announcements = await supabaseQuery<any>("announcements", { query })

    // Enrich with author data
    const enriched = await Promise.all(
      announcements.map(async (a: any) => {
        const authors = await supabaseQuery<any>("users", {
          query: `id=eq.${a.authorId}&select=id,name`,
        })
        return {
          ...a,
          author: authors[0] || null,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/announcements - Create announcement (admin only)
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

    const userId = (session.user as Record<string, unknown>).id as string
    const body = await req.json()
    const { title, content, category, isPublished } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const created = await supabaseQuery<any>("announcements", {
      method: "POST",
      body: {
        title,
        content,
        category: category || "GENERAL",
        authorId: userId,
        isPublished: isPublished !== false,
      },
    })

    const announcement = created[0]

    // Enrich with author data
    const authors = await supabaseQuery<any>("users", {
      query: `id=eq.${announcement.authorId}&select=id,name`,
    })

    return NextResponse.json({
      ...announcement,
      author: authors[0] || null,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating announcement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/announcements - Update announcement (admin only)
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
    const { id, title, content, category, isPublished } = body

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (title) updateData.title = title
    if (content) updateData.content = content
    if (category) updateData.category = category
    if (isPublished !== undefined) updateData.isPublished = isPublished

    const updated = await supabaseQuery<any>("announcements", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: updateData,
    })

    const announcement = updated[0]

    // Enrich with author data
    const authors = await supabaseQuery<any>("users", {
      query: `id=eq.${announcement.authorId}&select=id,name`,
    })

    return NextResponse.json({
      ...announcement,
      author: authors[0] || null,
    })
  } catch (error) {
    console.error("Error updating announcement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/announcements - Delete announcement (admin only)
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
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 })
    }

    await supabaseQuery("announcements", {
      method: "DELETE",
      query: `id=eq.${id}`,
    })

    return NextResponse.json({ message: "Announcement deleted successfully" })
  } catch (error) {
    console.error("Error deleting announcement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
