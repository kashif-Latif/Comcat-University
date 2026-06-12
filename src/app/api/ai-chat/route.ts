import { NextRequest, NextResponse } from 'next/server'

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

function trimConversation(history: Message[]): Message[] {
  const maxMessages = 24
  if (history.length <= maxMessages) return history
  return [history[0], ...history.slice(-(maxMessages - 1))]
}

/**
 * AI provider abstraction.
 * Supports:
 *   1. xAI Grok (OpenAI-compatible REST) — FREE tier available!
 *   2. OpenAI-compatible API (OpenAI, Together AI, Groq, Deepseek, etc.)
 *   3. Google Gemini (via REST)
 *   4. Z.ai SDK (z-ai-web-dev-sdk) — only works on Z.ai platform
 *
 * The provider is selected via the AI_PROVIDER env var:
 *   AI_PROVIDER=grok       → uses GROK_API_KEY (free tier at https://console.x.ai)
 *   AI_PROVIDER=openai     → uses OPENAI_API_KEY
 *   AI_PROVIDER=gemini     → uses GEMINI_API_KEY
 *   AI_PROVIDER=zai        → uses z-ai-web-dev-sdk (Z.ai platform only)
 *
 * Default: grok
 */
type Message = { role: 'system' | 'user' | 'assistant'; content: string }

async function callAI(messages: Message[]): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'grok').toLowerCase()

  // ─── xAI Grok (OpenAI-compatible, FREE tier) ───
  if (provider === 'grok') {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) throw new Error('GROK_API_KEY is not set')

    const model = process.env.GROK_MODEL || 'grok-3-mini'
    const baseUrl = 'https://api.x.ai/v1'

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      if (res.status === 401 || res.status === 403) {
        throw new Error('GROK_API_KEY_INVALID: Your xAI API key is invalid or revoked. Get a new key at https://console.x.ai')
      }
      if (res.status === 429) {
        throw new Error('GROK_QUOTA_EXCEEDED: Free tier rate limit reached. Wait a few minutes and try again, or upgrade at https://console.x.ai')
      }
      throw new Error(`Grok API error (${res.status}): ${err}`)
    }

    const data = await res.json()
    return data.choices[0]?.message?.content || ''
  }

  // ─── OpenAI-compatible (works with OpenAI, Together, Groq, Deepseek, etc.) ───
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI API error (${res.status}): ${err}`)
    }

    const data = await res.json()
    return data.choices[0]?.message?.content || ''
  }

  // ─── Google Gemini ───
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    // Gemini uses "user"/"model" roles, convert "system" to first user instruction
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
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
      const errBody = await res.text()
      // Provide user-friendly messages for common Gemini errors
      if (res.status === 403) {
        throw new Error('GEMINI_API_KEY_INVALID: Your API key has been revoked or is invalid. Please generate a new key at https://aistudio.google.com/apikey')
      }
      if (res.status === 429) {
        throw new Error('GEMINI_QUOTA_EXCEEDED: Free tier quota exhausted. Wait a few minutes, enable billing in Google AI Studio, or generate a new API key at https://aistudio.google.com/apikey')
      }
      throw new Error(`Gemini API error (${res.status}): ${errBody}`)
    }

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // ─── Z.ai SDK (only works on Z.ai platform — not available on Vercel) ───
  if (provider === 'zai') {
    console.warn('[AI] Z.ai provider is not supported on this platform. Falling back to Gemini.')
    // Fall through to error at the end
  }

  throw new Error(`Unknown or unsupported AI_PROVIDER: "${provider}". Use 'grok', 'openai', or 'gemini'.`)
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 })
    }

    // Build conversation history (Vercel serverless = no in-memory state,
    // so we rely on client-side history sent from the frontend)
    const clientHistory: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    // If the client sends conversation history, use it
    if (request.headers.get('x-conversation-history')) {
      try {
        const extra = JSON.parse(request.headers.get('x-conversation-history')!)
        for (const msg of extra) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            clientHistory.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
          }
        }
      } catch {}
    }

    // Always add the current message
    clientHistory.push({ role: 'user', content: message.trim() })

    const trimmedHistory = trimConversation(clientHistory)

    const aiResponse = await callAI(trimmedHistory)

    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    return NextResponse.json({ success: true, response: aiResponse })
  } catch (error) {
    console.error('AI Chat error:', error)
    const errMsg = String(error)
    // Pass through specific user-actionable errors so the frontend can display them
    if (errMsg.includes('GROK_API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'Your xAI/Grok API key is invalid or revoked. Get a new key at https://console.x.ai and update your .env file.', details: errMsg },
        { status: 403 }
      )
    }
    if (errMsg.includes('GROK_QUOTA_EXCEEDED')) {
      return NextResponse.json(
        { error: 'Grok free tier rate limit reached. Wait a few minutes and try again, or upgrade your plan at https://console.x.ai.', details: errMsg },
        { status: 429 }
      )
    }
    if (errMsg.includes('GROK_API_KEY is not set')) {
      return NextResponse.json(
        { error: 'GROK_API_KEY is not configured. Add it to your .env file. Get a free key at https://console.x.ai', details: errMsg },
        { status: 500 }
      )
    }
    if (errMsg.includes('GEMINI_API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'Your Gemini API key has been revoked or is invalid. Please generate a new key at https://aistudio.google.com/apikey and update your .env file.', details: errMsg },
        { status: 403 }
      )
    }
    if (errMsg.includes('GEMINI_QUOTA_EXCEEDED')) {
      return NextResponse.json(
        { error: 'Gemini free tier quota exhausted. Please wait a few minutes, enable billing, or use a different API key.', details: errMsg },
        { status: 429 }
      )
    }
    if (errMsg.includes('GEMINI_API_KEY is not set')) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured. Add it to your .env file. Get a key at https://aistudio.google.com/apikey', details: errMsg },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to get AI response', details: errMsg },
      { status: 500 }
    )
  }
}
