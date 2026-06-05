'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Minus,
  Trash2,
  ChevronDown,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const QUICK_QUESTIONS = [
  'What programs are offered?',
  'How to apply for admission?',
  'What is the fee structure?',
  'Where is the campus located?',
  'How to contact the university?',
  'What are the admission requirements?',
]


export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('comcat-chat-history')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch {}
    }
    return [{
      role: 'assistant',
      content: 'Welcome to COMCAT University! I\'m your AI assistant. How can I help you today? Ask me about admissions, programs, fees, campus life, or anything else!',
      timestamp: Date.now(),
    }]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickQuestions, setShowQuickQuestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)

  // Persist messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('comcat-chat-history', JSON.stringify(messages))
      } catch {}
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: text.trim(), timestamp: Date.now() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setShowQuickQuestions(false)
    setIsLoading(true)

    try {
      // Send conversation history so serverless backends (Vercel) can maintain context
      const historyForServer = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-conversation-history': JSON.stringify(historyForServer),
        },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: sessionIdRef.current,
        }),
      })

      const data = await res.json()

      if (data.success && data.response) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response, timestamp: Date.now() },
        ])
      } else {
        // Show specific error message if the API provided one (e.g. key revoked, quota exceeded)
        const errorMsg = data.error
          ? `⚠️ ${data.error}`
          : 'Sorry, I encountered an issue. Please try again or contact us at admin@comcat.edu.pk.'
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorMsg, timestamp: Date.now() },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check your internet connection and try again.', timestamp: Date.now() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickQuestion = (question: string) => {
    sendMessage(question)
  }

  const clearHistory = () => {
    const welcomeMsg: Message = {
      role: 'assistant',
      content: 'Chat history cleared! How can I help you today?',
      timestamp: Date.now(),
    }
    setMessages([welcomeMsg])
    setShowQuickQuestions(true)
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('comcat-chat-history') } catch {}
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => { setIsOpen(true); setIsMinimized(false) }}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A84C] text-black shadow-lg transition-shadow hover:shadow-[0_0_30px_rgba(201,168,76,0.5)]"
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
            {/* Pulse ring */}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A84C] opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={isMinimized ? { opacity: 1, y: 0, scale: 1, height: 'auto' } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-[#0f0f0f] shadow-2xl backdrop-blur-sm ${
              isMinimized ? 'w-[320px]' : 'h-[560px] w-[380px] sm:h-[600px] sm:w-[420px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 bg-gradient-to-r from-[#1a1a1a] to-[#111] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/30">
                  <Sparkles className="h-4 w-4 text-[#C9A84C]" />
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">COMCAT AI Assistant</h3>
                  <p className="text-[11px] text-[#a3a3a3]">Always online to help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearHistory}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-white/5 hover:text-white"
                  title="Clear chat history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-white/5 hover:text-white"
                  title={isMinimized ? 'Maximize' : 'Minimize'}
                >
                  {isMinimized ? <ChevronDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Body (hidden when minimized) */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          msg.role === 'user' ? 'bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/30' : 'bg-[#1a1a1a] ring-1 ring-gray-800'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User className="h-3.5 w-3.5 text-[#C9A84C]" />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </div>
                      <div className="max-w-[80%]">
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[#C9A84C] text-black rounded-tr-sm font-medium'
                              : 'bg-[#1a1a1a] text-[#e5e5e5] border border-gray-800/50 rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className={`mt-1 text-[10px] text-[#525252] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] ring-1 ring-gray-800">
                        <Bot className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-800/50 bg-[#1a1a1a] px-4 py-3">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C9A84C]" />
                        <span className="text-xs text-[#737373]">Thinking...</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Questions */}
                {showQuickQuestions && messages.length <= 2 && !isLoading && (
                  <div className="border-t border-gray-800/50 px-4 py-2">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#525252]">
                      Quick Questions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQuickQuestion(q)}
                          className="rounded-full border border-gray-700/50 bg-[#111] px-3 py-1.5 text-[11px] text-[#a3a3a3] transition-all hover:border-[#C9A84C]/30 hover:bg-[#C9A84C]/5 hover:text-[#C9A84C]"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-800 bg-[#0a0a0a] px-4 py-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 rounded-full border border-gray-700/50 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder:text-[#525252] focus:border-[#C9A84C]/40 focus:outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9A84C] text-black transition-all hover:bg-[#B8963A] disabled:opacity-30 disabled:hover:bg-[#C9A84C]"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
