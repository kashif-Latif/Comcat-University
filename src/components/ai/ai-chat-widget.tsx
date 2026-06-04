'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Trash2, Minimize2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function generateSessionId() {
  return 'chat-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36)
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => generateSessionId())
  const [hasGreeted, setHasGreeted] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setHasGreeted(true)
      setMessages([{
        role: 'assistant',
        content: 'Assalam o Alaikum! Welcome to COMCAT University! I\'m your AI assistant. How can I help you today?\n\nYou can ask me about:\n- Admission requirements & process\n- Available programs (BS CS, IT, SE, DS, Cyber Security)\n- Fee structure & scholarships\n- Campus facilities & location\n- Faculty & departments'
      }])
    }
  }, [isOpen, hasGreeted, messages.length])

  const sendMessage = useCallback(async (msgText?: string) => {
    const trimmed = (msgText || input).trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMessage])
    if (!msgText) setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId }),
      })
      const data = await response.json()

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an issue. Please try again or contact us at +92 314 4253900.'
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please check your internet and try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sessionId])

  const clearChat = async () => {
    setMessages([])
    setHasGreeted(false)
    try { await fetch(`/api/ai-chat?sessionId=${sessionId}`, { method: 'DELETE' }) } catch { /* */ }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const toggleChat = () => { setIsOpen(!isOpen); setIsMinimized(false) }

  const quickQuestions = [
    'What programs do you offer?',
    'How to apply for admission?',
    'What is the fee structure?',
    'Where is the campus located?',
  ]

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 z-[9999] flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#333] bg-[#111] shadow-2xl shadow-black/50 sm:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#262626] bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9A84C]/20">
                  <Bot className="h-5 w-5 text-[#C9A84C]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">COMCAT Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-gray-400">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-[#1a1a1a] hover:text-gray-300" title="Clear chat"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setIsMinimized(true)} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-[#1a1a1a] hover:text-gray-300" title="Minimize"><Minimize2 className="h-4 w-4" /></button>
                <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-[#1a1a1a] hover:text-red-400" title="Close"><X className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-[#C9A84C] text-black' : 'bg-[#1a1a1a] text-[#C9A84C] border border-[#333]'}`}>
                      {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#C9A84C] text-black rounded-br-md' : 'bg-[#1a1a1a] text-gray-200 border border-[#262626] rounded-bl-md'}`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[#C9A84C] border border-[#333]"><Bot className="h-3.5 w-3.5" /></div>
                    <div className="rounded-2xl rounded-bl-md border border-[#262626] bg-[#1a1a1a] px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick Questions */}
            {messages.length <= 1 && !isLoading && (
              <div className="border-t border-[#262626] bg-[#0a0a0a] px-4 py-3">
                <p className="mb-2 text-xs text-gray-500">Quick questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="rounded-full border border-[#333] bg-[#111] px-3 py-1 text-xs text-gray-300 transition-colors hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/10 hover:text-[#C9A84C]"
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[#262626] bg-[#111] p-3">
              <div className="flex items-center gap-2">
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Type your message..." disabled={isLoading}
                  className="flex-1 rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:border-[#C9A84C]/50 disabled:opacity-50"
                />
                <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#C9A84C] text-black transition-all hover:bg-[#B8963A] disabled:opacity-40"
                ><Send className="h-4 w-4" /></button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-gray-600">Powered by COMCAT AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized bar */}
      <AnimatePresence>
        {isOpen && isMinimized && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-24 right-4 z-[9999] flex cursor-pointer items-center gap-3 rounded-full border border-[#333] bg-[#111] px-4 py-2.5 shadow-lg transition-colors hover:border-[#C9A84C]/50"
          >
            <Bot className="h-4 w-4 text-[#C9A84C]" />
            <span className="text-sm font-medium text-white">COMCAT Assistant</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button onClick={toggleChat} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A84C] text-black shadow-lg shadow-[#C9A84C]/25 transition-shadow hover:shadow-xl hover:shadow-[#C9A84C]/30"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
