/**
 * RagPage — Example usage of the RAG pipeline.
 *
 * Two-phase UI:
 *   Phase 1 (Index): pick a local file → index it → see chunk count
 *   Phase 2 (Query): ask questions → stream grounded answers
 *
 * The file path for the bundled example doc is shown as a preset.
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  FileText,
  Search,
  Upload,
  CheckCircle,
  AlertCircle,
  Send,
  Square,
  Bot,
  User,
  Trash2,
  Loader2
} from 'lucide-react'
import { useRag } from '../hooks/useRag'
import { MarkdownContent } from '../components/MarkdownContent'

const isDev = import.meta.env.DEV

// ---------------------------------------------------------------------------
// Index panel
// ---------------------------------------------------------------------------

interface IndexPanelProps {
  onIndex: (filePath: string) => void
  isIndexing: boolean
  error: string | null
}

function IndexPanel({ onIndex, isIndexing, error }: IndexPanelProps) {
  const [filePath, setFilePath] = useState('')

  const handleBrowse = async () => {
    const result = await window.api.fsOpenFile()
    if (result) setFilePath(result.filePath)
  }

  const handleUseExample = () => {
    // Point to the bundled example.txt
    // In dev: relative to project root; in prod: from resourcesPath
    const examplePath = isDev
      ? 'resources/data/example.txt'
      : `${process.resourcesPath}/resources/data/example.txt`
    setFilePath(examplePath)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Select a local <strong>.txt</strong> or <strong>.md</strong> file to index.
          The pipeline will split it into chunks, embed each chunk with OpenAI Embeddings,
          and store the vectors in memory so you can ask questions about its content.
        </p>

        <button
          type="button"
          onClick={handleUseExample}
          className="text-xs text-primary underline underline-offset-2 hover:opacity-75 transition-opacity mb-3 block"
        >
          Use bundled example (Tesseract AI product docs)
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="/absolute/path/to/document.txt"
          className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={handleBrowse}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors"
        >
          Browse…
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => filePath.trim() && onIndex(filePath.trim())}
        disabled={!filePath.trim() || isIndexing}
        className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isIndexing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Indexing…
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            Index File
          </>
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat area
// ---------------------------------------------------------------------------

interface ChatAreaProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  isQuerying: boolean
  queryError: string | null
  onAsk: (q: string) => void
  onCancel: () => void
  onClear: () => void
}

function ChatArea({ messages, isQuerying, queryError, onAsk, onCancel, onClear }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const handleSend = () => {
    const q = input.trim()
    if (!q || isQuerying) return
    setInput('')
    onAsk(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4 px-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Ask anything about the indexed document.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              {msg.role === 'user' ? (
                <div className="w-fit max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words bg-primary text-primary-foreground">
                  {msg.content}
                </div>
              ) : (
                <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted text-foreground">
                  {!msg.content
                    ? <span className="opacity-40 animate-pulse">▋</span>
                    : <MarkdownContent content={msg.content} />
                  }
                </div>
              )}
            </div>
          ))
        )}

        {queryError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{queryError}</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input row */}
      <div className="shrink-0 pt-3 border-t">
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex-1 flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isQuerying}
              placeholder="Ask a question about the document…"
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px] py-0.5"
            />
            {isQuerying ? (
              <button type="button" onClick={onCancel}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button type="button" onClick={handleSend} disabled={!input.trim()}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const RagPage: React.FC = () => {
  const {
    indexedFile, isIndexing, indexError, index,
    messages, isQuerying, queryError, ask, cancelQuery, clearMessages
  } = useRag()

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Document RAG</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Retrieval-Augmented Generation — ground AI answers in a local document.
        </p>
      </div>

      {/* Index status badge */}
      {indexedFile && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-foreground font-medium truncate">{indexedFile.filePath.split(/[/\\]/).pop()}</span>
          <span className="text-muted-foreground text-xs ml-auto shrink-0">
            {indexedFile.chunkCount} chunks indexed
          </span>
        </div>
      )}

      {/* Index panel — always visible so user can re-index a different file */}
      <div className="shrink-0 rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 mb-3">
          {indexedFile ? '↺ Re-index a different file' : '1 — Index a file'}
        </p>
        <IndexPanel
          onIndex={(fp) => index(fp, 'openai')}
          isIndexing={isIndexing}
          error={indexError}
        />
      </div>

      {/* Chat area — only shown once a file is indexed */}
      {indexedFile ? (
        <div className="flex flex-col flex-1 min-h-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 mb-3 shrink-0">
            2 — Ask questions
          </p>
          <ChatArea
            messages={messages}
            isQuerying={isQuerying}
            queryError={queryError}
            onAsk={ask}
            onCancel={cancelQuery}
            onClear={clearMessages}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground/40 text-sm">
          Index a file above to start asking questions.
        </div>
      )}
    </div>
  )
}

export default RagPage
