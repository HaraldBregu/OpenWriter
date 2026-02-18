import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Send, Square, Bot, User, AlertCircle, ChevronDown, Plus, Copy, Check } from 'lucide-react'
import { useAgent } from '../hooks/useAgent'
import { useAppDispatch, useAppSelector } from '../store'
import {
  createThread,
  updateThreadProvider,
  selectActiveThread,
  selectRunningThreadId
} from '../store/chatSlice'
import type { ChatMessage } from '../store/chatSlice'

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

/** Tracks the `dark` class on <html> and returns true when dark mode is active. */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

/** One-shot copy-to-clipboard button. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    window.api.clipboardWriteText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="absolute top-2 right-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground bg-muted/60 hover:bg-muted transition-colors opacity-0 group-hover/code:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  const isDark = useIsDark()
  const codeTheme = isDark ? oneDark : oneLight

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Paragraphs
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,

        // Headings
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,

        // Lists
        ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,

        // Inline formatting
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,

        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className={`border-l-2 pl-3 my-2 italic ${isUser ? 'border-white/40 opacity-80' : 'border-border opacity-70'}`}>
            {children}
          </blockquote>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            onClick={(e) => { e.preventDefault(); if (href) window.open(href) }}
            className="underline underline-offset-2 hover:opacity-75 transition-opacity cursor-pointer"
          >
            {children}
          </a>
        ),

        // Horizontal rule
        hr: () => <hr className="my-3 border-current opacity-20" />,

        // Table
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className={`px-3 py-1.5 text-left font-semibold border ${isUser ? 'border-white/20' : 'border-border'}`}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className={`px-3 py-1.5 border ${isUser ? 'border-white/20' : 'border-border'}`}>
            {children}
          </td>
        ),

        // Code — inline vs block
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')

          if (!match) {
            // Inline code
            return (
              <code
                className={`rounded px-1 py-0.5 text-xs font-mono ${
                  isUser ? 'bg-black/20' : 'bg-muted text-foreground'
                }`}
                {...props}
              >
                {children}
              </code>
            )
          }

          // Fenced code block
          const codeStr = String(children).replace(/\n$/, '')
          return (
            <div className="relative group/code my-2 rounded-md text-xs">
              <CopyButton text={codeStr} />
              <SyntaxHighlighter
                style={codeTheme}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  padding: '0.75rem 1rem',
                  overflowX: 'auto'
                }}
              >
                {codeStr}
              </SyntaxHighlighter>
            </div>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
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
}

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

  const handleNewThread = () => dispatch(createThread('openai'))

  const handleProviderChange = (providerId: string) => {
    if (activeThread && !isRunning) {
      dispatch(updateThreadProvider({ threadId: activeThread.id, providerId }))
    }
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isRunning || !activeThread) return
    const history = activeThread.messages
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }))
    setInput('')
    await run(trimmed, activeThread.id, history, activeThread.providerId)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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
