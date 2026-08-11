import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/api-guard'
import { toolsForRole, executeTool, type ToolContext, type ToolSchema } from '@/lib/chat-tools'

// ─── System prompt builder ─────────────────────────────────
// The prompt varies by role so the LLM knows what tools it has
// and what "the current student/teacher" means.
function buildSystemPrompt(ctx: ToolContext): string {
  const base = `You are the COMCAT University AI Assistant — a helpful, professional, and friendly chatbot for COMCAT University, Lahore, Pakistan.

KEY INFORMATION:
- Full Name: COMCAT University
- Location: Hamdard Chowk, Lahore, Pakistan
- Phone: +92 314 4253900
- Email: admin@comcat.edu.pk
- Developer: Muhammad Kashif Latif

ACADEMIC PROGRAMS (4-year BS Degrees):
1. BS Computer Science — 4 years, 130 credits
2. BS Information Technology — 4 years, 126 credits
3. BS Software Engineering — 4 years, 130 credits
4. BS Data Science — 4 years, 126 credits
5. BS Cyber Security — 4 years, 130 credits

FEE STRUCTURE:
- PKR 75,000 per semester (approximately)
- Multiple payment options available
- Scholarships for meritorious students

ADMISSIONS:
- Open for upcoming semester
- Apply online through the portal
- Requirements: Intermediate (FSc/FA) with minimum 50% marks
- Entry test may be required for some programs

BEHAVIOR RULES:
- Be concise but thorough.
- Use bullet points for lists.
- Be warm, encouraging, and professional.
- If unsure about specific details, guide users to contact admin@comcat.edu.pk or call +92 314 4253900.
- Never make up information about deadlines, specific dates, or exact fee amounts that may change.
- Respond in English unless the user writes in another language.`

  if (ctx.role === 'STUDENT') {
    return `${base}

CURRENT USER: You are speaking with ${ctx.userName || 'a student'} — a currently enrolled student at COMCAT University.

TOOL USAGE:
- You have direct access to this student's real academic data via the tools available.
- When they ask about THEIR OWN grades, CGPA, attendance, fees, subjects, or upcoming exams, CALL THE RELEVANT TOOL. Never guess or make up numbers.
- After calling a tool, present the returned data conversationally — not as raw text. E.g. "Your current CGPA is 3.70 — nicely done!" not just "CGPA: 3.70".
- If a tool returns "not graded yet" or empty data, say so honestly rather than making numbers up.
- For general questions (programs, fees structure, campus, admissions) answer from the KEY INFORMATION above — no tool call needed.
- Address the student by their first name when it feels natural.`
  }

  if (ctx.role === 'TEACHER') {
    return `${base}

CURRENT USER: You are speaking with ${ctx.userName || 'a teacher'} — a faculty member at COMCAT University.

TOOL USAGE:
- You have access to this teacher's teaching load via the available tools.
- When they ask about their subjects or students, CALL THE RELEVANT TOOL.
- Present the returned data conversationally.`
  }

  if (ctx.role === 'ADMIN') {
    return `${base}

CURRENT USER: You are speaking with ${ctx.userName || 'an administrator'} — an administrator of COMCAT University.

TOOL USAGE:
- You can query university-wide statistics via the available tools.
- When they ask about totals, pending admissions, or unread messages, CALL THE RELEVANT TOOL.`
  }

  return base  // anonymous
}

// ─── Groq (OpenAI-format) with function calling ───────────
type OpenAIMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: any[] }
  | { role: 'tool'; tool_call_id: string; content: string }

async function callGroq(messages: OpenAIMessage[], tools: ToolSchema[] | null): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

  const payload: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  }
  if (tools && tools.length > 0) {
    payload.tools = tools
    payload.tool_choice = 'auto'
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    if (res.status === 401 || res.status === 403) throw new Error(`GROQ_AUTH: ${err}`)
    if (res.status === 429) throw new Error(`GROQ_RATE: ${err}`)
    throw new Error(`GROQ_ERR_${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Gemini (no tool-calling for simplicity — used as fallback) ───
async function callGeminiTextOnly(messages: OpenAIMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  const systemMsg = messages.find(m => m.role === 'system') as { content: string } | undefined
  const chatMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: typeof m.content === 'string' ? m.content : '' }],
    }))
  if (systemMsg) {
    chatMessages.unshift({ role: 'user', parts: [{ text: `System instructions: ${systemMsg.content}` }] })
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatMessages,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    if (res.status === 401 || res.status === 403) throw new Error(`GEMINI_AUTH: ${err}`)
    if (res.status === 429) throw new Error(`GEMINI_RATE: ${err}`)
    throw new Error(`GEMINI_ERR_${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ─── Main tool-calling loop ────────────────────────────────
// 1. Call Groq with tools
// 2. If response contains tool_calls, execute them, append results, loop
// 3. Otherwise return the final content
// Capped at 3 iterations to prevent runaway loops.
async function chatWithTools(
  initialMessages: OpenAIMessage[],
  tools: ToolSchema[],
  ctx: ToolContext,
): Promise<string> {
  const messages: OpenAIMessage[] = [...initialMessages]
  const MAX_ITERATIONS = 3

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const data = await callGroq(messages, tools.length > 0 ? tools : null)
    const choice = data.choices?.[0]
    if (!choice) return ''

    const msg = choice.message
    const toolCalls = msg.tool_calls as any[] | undefined

    // No tool calls → we have the final answer
    if (!toolCalls || toolCalls.length === 0) {
      return msg.content || ''
    }

    // Append the assistant message that requested tools
    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: toolCalls,
    })

    // Execute each tool call and append its result
    for (const call of toolCalls) {
      const name = call.function?.name
      if (!name) continue

      console.log(`[chat] tool call: ${name} (role=${ctx.role})`)
      let result: string
      try {
        result = await executeTool(name, ctx)
      } catch (err) {
        console.error(`[chat] tool ${name} threw:`, err)
        result = `Error executing ${name}.`
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      })
    }
  }

  // Ran out of iterations — ask for a final answer without tools
  const finalData = await callGroq(messages, null)
  return finalData.choices?.[0]?.message?.content || 'Sorry, I could not complete that request.'
}

// ─── Route handler ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 30 messages per minute per IP
  const limited = rateLimit(request, 'ai-chat:post', 30, 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const { message, sessionId, history: historyFromBody } = body

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 })
    }
    if (typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Invalid or oversized message' }, { status: 400 })
    }

    // Detect who's asking
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as (Record<string, unknown> & { name?: string; email?: string }) | undefined
    const ctx: ToolContext = sessionUser
      ? {
          userId: String(sessionUser.id || ''),
          role: (String(sessionUser.role || 'STUDENT').toUpperCase() as ToolContext['role']),
          userName: sessionUser.name?.split(' ')[0],
        }
      : { userId: '', role: 'ANON' }

    const systemPrompt = buildSystemPrompt(ctx)
    const availableTools = toolsForRole(ctx.role)

    // Assemble message list — accept history from body (new widget) or header (old)
    const messages: OpenAIMessage[] = [{ role: 'system', content: systemPrompt }]

    let extra: unknown = null
    if (Array.isArray(historyFromBody)) {
      extra = historyFromBody
    } else {
      const headerHist = request.headers.get('x-conversation-history')
      if (headerHist) {
        try { extra = JSON.parse(headerHist) } catch {}
      }
    }
    if (Array.isArray(extra)) {
      for (const m of extra.slice(-12)) {
        const mm = m as { role?: string; content?: string }
        if (mm?.role === 'user' || mm?.role === 'assistant') {
          const content = String(mm.content || '').slice(0, 4000)
          if (content) messages.push({ role: mm.role, content })
        }
      }
    }
    messages.push({ role: 'user', content: message.trim() })

    // Try Groq with tools first
    try {
      const response = await chatWithTools(messages, availableTools, ctx)
      if (response && response.trim()) {
        return NextResponse.json({ success: true, response })
      }
      throw new Error('Empty response from Groq')
    } catch (groqErr) {
      console.error('Groq path failed, falling back to Gemini:', groqErr)
      // Fallback: Gemini text-only (no tools). The LLM will answer from general
      // knowledge without live DB access, which is fine for public/anon flow
      // and degrades gracefully when Groq is over quota.
      if (process.env.GEMINI_API_KEY) {
        const response = await callGeminiTextOnly(messages)
        if (response && response.trim()) {
          return NextResponse.json({ success: true, response })
        }
      }
      throw groqErr
    }
  } catch (error) {
    console.error('AI Chat error:', error)
    const errMsg = String(error)

    if (errMsg.includes('GROQ_API_KEY not set') || errMsg.includes('GEMINI_API_KEY not set')) {
      return NextResponse.json(
        { error: 'The AI assistant is not configured yet. Please contact admin@comcat.edu.pk.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'The AI assistant is temporarily unavailable. Please try again in a moment.' },
      { status: 503 }
    )
  }
}
