import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api-guard'

const SYSTEM_PROMPT = `You are the COMCAT University AI Assistant — a helpful, professional, and friendly chatbot for COMCAT University, Lahore, Pakistan.

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

CAMPUS FACILITIES:
- Modern computer labs
- Digital library
- Research centers
- Cafeteria
- Sports facilities
- Prayer area

FACULTY:
- 10+ qualified professors with PhD degrees from renowned institutions
- Industry-experienced lecturers

BEHAVIOR RULES:
- Be concise but thorough in responses
- Use bullet points for lists
- Be warm, encouraging, and professional
- If unsure about specific details, guide users to contact admin@comcat.edu.pk or call +92 314 4253900
- Never make up information about deadlines, specific dates, or exact fee amounts that may change
- Respond in English unless the user writes in another language`

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

function trimConversation(history: Message[]): Message[] {
  const maxMessages = 24
  if (history.length <= maxMessages) return history
  return [history[0], ...history.slice(-(maxMessages - 1))]
}

// ─── Provider callers ──────────────────────────────────────
async function callGroq(messages: Message[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
  })
  if (!res.ok) {
    const err = await res.text()
    if (res.status === 401 || res.status === 403) throw new Error(`GROQ_AUTH: ${err}`)
    if (res.status === 429) throw new Error(`GROQ_RATE: ${err}`)
    throw new Error(`GROQ_ERR_${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices[0]?.message?.content || ''
}

async function callGemini(messages: Message[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
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

// ─── Provider chain with automatic fallback ────────────────
// Tries Groq first (fast + free), then Gemini as backup.
// Any providers with missing keys are silently skipped.
async function callAI(messages: Message[]): Promise<string> {
  const errors: string[] = []
  const chain: Array<() => Promise<string>> = []

  if (process.env.GROQ_API_KEY) chain.push(() => callGroq(messages))
  if (process.env.GEMINI_API_KEY) chain.push(() => callGemini(messages))

  if (chain.length === 0) {
    throw new Error('NO_PROVIDER: No AI provider is configured. Set GROQ_API_KEY or GEMINI_API_KEY.')
  }

  for (const fn of chain) {
    try {
      const out = await fn()
      if (out && out.trim()) return out
    } catch (e) {
      errors.push(String(e))
    }
  }
  throw new Error(`ALL_PROVIDERS_FAILED: ${errors.join(' | ')}`)
}

// ─── Route handler ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 30 messages per minute per IP — one user typing fast is fine,
  // a scraper hammering the endpoint gets blocked.
  const limited = rateLimit(request, 'ai-chat:post', 30, 60 * 1000)
  if (limited) return limited

  try {
    const { message, sessionId } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 })
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Invalid or oversized message' }, { status: 400 })
    }

    const clientHistory: Message[] = [{ role: 'system', content: SYSTEM_PROMPT }]

    const historyHeader = request.headers.get('x-conversation-history')
    if (historyHeader) {
      try {
        const extra = JSON.parse(historyHeader)
        if (Array.isArray(extra)) {
          for (const msg of extra.slice(-24)) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              const content = String(msg.content || '').slice(0, 4000)
              if (content) clientHistory.push({ role: msg.role, content })
            }
          }
        }
      } catch {}
    }

    clientHistory.push({ role: 'user', content: message.trim() })
    const trimmed = trimConversation(clientHistory)

    const aiResponse = await callAI(trimmed)
    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    return NextResponse.json({ success: true, response: aiResponse })
  } catch (error) {
    console.error('AI Chat error:', error)
    const errMsg = String(error)

    if (errMsg.includes('NO_PROVIDER')) {
      return NextResponse.json(
        { error: 'The AI assistant is not configured yet. Please contact admin@comcat.edu.pk.' },
        { status: 503 }
      )
    }
    if (errMsg.includes('ALL_PROVIDERS_FAILED')) {
      return NextResponse.json(
        { error: 'The AI assistant is temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again shortly.' },
      { status: 500 }
    )
  }
}
