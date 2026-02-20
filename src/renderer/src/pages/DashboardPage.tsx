import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Bot, User, AlertCircle, ChevronDown, Plus } from 'lucide-react'
import { useAgent } from '../hooks/useAgent'
import { useAppDispatch, useAppSelector } from '../store'
import {
  createThread,
  updateThreadProvider,
  selectActiveThread,
  selectRunningThreadId
} from '../store/chatSlice'
import type { ChatMessage } from '../store/chatSlice'
import { MarkdownContent } from '../components/MarkdownContent'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'google', label: 'Google' },
  { id: 'meta', label: 'Meta' },
  { id: 'mistral', label: 'Mistral' }
]

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

const MessageBubble = React.memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {isUser ? (
        // User messages: plain text, shrinks to content
        <div className="w-fit max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words bg-primary text-primary-foreground">
          {message.content}
        </div>
      ) : (
        // Assistant messages: markdown, wider to accommodate code blocks and tables
        <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted text-foreground">
          {!message.content ? (
            <span className="opacity-40 animate-pulse">▋</span>
          ) : (
            <MarkdownContent content={message.content} isUser={false} />
          )}
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// Provider dropdown
// ---------------------------------------------------------------------------

function ProviderSelect({
  value,
  onChange,
  disabled
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = PROVIDERS.find((p) => p.id === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {current?.label}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-md border border-border bg-popover text-popover-foreground shadow-md py-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                p.id === value ? 'font-medium text-foreground' : 'text-foreground/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Bot className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No thread selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a new thread to start a conversation.
        </p>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        New Thread
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const activeThread = useAppSelector(selectActiveThread)
  const runningThreadId = useAppSelector(selectRunningThreadId)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { isRunning, error, run, cancel } = useAgent()

  // True only when THIS thread is the one running (affects the stop button)
  const thisThreadRunning = isRunning && runningThreadId === activeThread?.id

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const handleNewThread = useCallback(() => dispatch(createThread('openai')), [dispatch])

  const handleProviderChange = useCallback((providerId: string) => {
    if (activeThread && !isRunning) {
      dispatch(updateThreadProvider({ threadId: activeThread.id, providerId }))
    }
  }, [activeThread, isRunning, dispatch])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isRunning || !activeThread) return
    const history = activeThread.messages
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }))
    setInput('')
    await run(trimmed, activeThread.id, history, activeThread.providerId)
  }, [input, isRunning, activeThread, run])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!activeThread) {
    return <EmptyState onNew={handleNewThread} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{activeThread.title}</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {thisThreadRunning ? 'Streaming…' : 'Running in another thread…'}
            </span>
          )}
        </div>
        <ProviderSelect
          value={activeThread.providerId}
          onChange={handleProviderChange}
          disabled={isRunning}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {activeThread.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Bot className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Start the conversation — type a message below.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Make sure an API token is set in Settings → Models.
            </p>
          </div>
        ) : (
          activeThread.messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur px-6 py-4">
        <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring transition-shadow">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the AI… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isRunning}
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[160px] py-0.5"
          />
          {thisThreadRunning ? (
            // Stop button — only for the thread currently streaming
            <button
              type="button"
              onClick={cancel}
              className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              title="Stop generation"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            // Send button — disabled globally while any thread is running
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || !activeThread || isRunning}
              className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={isRunning ? 'Another thread is running' : 'Send message'}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/50 text-center">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}

export default DashboardPage
