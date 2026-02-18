/**
 * useRag — React hook for the RAG pipeline.
 *
 * Phases:
 *   1. Index  — call index(filePath) once per file; streams progress via rag:status
 *   2. Query  — call ask(question) to stream an answer token by token
 *
 * Mirrors the same streaming event pattern as useAgent so the UI can
 * follow a uniform pattern for any LLM-backed streaming operation.
 */

import { useState, useCallback, useRef } from 'react'

export interface RagMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface IndexedFileInfo {
  filePath: string
  chunkCount: number
  indexedAt: number
}

export interface UseRagReturn {
  // Index state
  indexedFile: IndexedFileInfo | null
  isIndexing: boolean
  indexError: string | null
  index: (filePath: string, providerId: string) => Promise<void>

  // Query state
  messages: RagMessage[]
  isQuerying: boolean
  queryError: string | null
  ask: (question: string) => Promise<void>
  cancelQuery: () => void
  clearMessages: () => void
}

export function useRag(): UseRagReturn {
  // --- Index state ---
  const [indexedFile, setIndexedFile] = useState<IndexedFileInfo | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexError, setIndexError] = useState<string | null>(null)

  // --- Query state ---
  const [messages, setMessages] = useState<RagMessage[]>([])
  const [isQuerying, setIsQuerying] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  // Internal refs
  const isQueryingRef = useRef(false)
  const currentRunId = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const currentTokens = useRef('')

  // --------------------------------------------------------------------------
  // Indexing
  // --------------------------------------------------------------------------

  const index = useCallback(async (filePath: string, providerId: string) => {
    setIsIndexing(true)
    setIndexError(null)
    try {
      const result = await window.api.ragIndex(filePath, providerId)
      setIndexedFile({ ...result, indexedAt: Date.now() })
      setMessages([]) // clear conversation when a new file is indexed
    } catch (err) {
      setIndexError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsIndexing(false)
    }
  }, [])

  // --------------------------------------------------------------------------
  // Querying (streaming)
  // --------------------------------------------------------------------------

  const ask = useCallback(async (question: string) => {
    if (isQueryingRef.current || !indexedFile) return

    isQueryingRef.current = true
    const runId = `rag-${Date.now()}-${Math.random().toString(36).slice(2)}`
    currentRunId.current = runId
    currentTokens.current = ''

    setQueryError(null)
    setIsQuerying(true)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '' }
    ])

    const finish = (err?: string) => {
      isQueryingRef.current = false
      setIsQuerying(false)
      currentRunId.current = null
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
      if (err) setQueryError(err)
    }

    const unsub = window.api.onRagEvent((eventType, data) => {
      const d = data as Record<string, unknown>
      if (d.runId !== runId) return

      switch (eventType) {
        case 'rag:token': {
          currentTokens.current += d.token as string
          const snapshot = currentTokens.current
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: snapshot }
            return updated
          })
          break
        }
        case 'rag:done':
          finish()
          break
        case 'rag:error':
          finish(d.error as string)
          break
      }
    })

    unsubRef.current = unsub

    await window.api.ragQuery(
      indexedFile.filePath,
      question,
      runId,
      'openai' // RAG always uses OpenAI (embeddings require it)
    )
  }, [indexedFile])

  const cancelQuery = useCallback(() => {
    if (currentRunId.current) {
      window.api.ragCancel(currentRunId.current)
      currentRunId.current = null
    }
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    isQueryingRef.current = false
    setIsQuerying(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setQueryError(null)
  }, [])

  return {
    indexedFile,
    isIndexing,
    indexError,
    index,
    messages,
    isQuerying,
    queryError,
    ask,
    cancelQuery,
    clearMessages
  }
}
