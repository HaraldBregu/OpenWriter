import { useState, useEffect, useCallback, useRef } from 'react'
import { type Editor } from '@tiptap/core'
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIEnhanceInput {
  text: string
}

interface AIEnhanceOutput {
  content: string
  tokenCount: number
}

export interface UseBlockEnhancementOptions {
  /** Stable ref to the TipTap editor instance. The hook reads/writes to it imperatively. */
  editorRef: React.RefObject<Editor | null>
  /** Stable ref to the onChange callback so we can sync parent state after completion/revert. */
  onChangeRef: React.RefObject<(id: string, content: string) => void>
  /** Stable ref to the block id so event handlers are never stale. */
  blockIdRef: React.RefObject<string>
}

export interface UseBlockEnhancementReturn {
  /** True while an enhance task is running or streaming. */
  isEnhancing: boolean
  /**
   * Trigger AI enhancement for the block's current content.
   * No-ops when: already enhancing, editor is null/destroyed, or content is empty.
   */
  handleEnhance: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the full AI enhancement lifecycle for a single ContentBlock:
 *   1. Submits an 'ai-enhance' task via the shared TaskStore (useTaskSubmit)
 *   2. Streams tokens directly into the TipTap editor as they arrive
 *   3. Syncs parent state on completion
 *   4. Reverts the editor to the pre-enhance snapshot on error or cancellation
 *   5. Cancels any in-flight task on unmount
 *
 * The hook deliberately receives refs rather than raw values so that none of
 * its internal effects ever need to re-subscribe due to prop identity changes.
 */
export function useBlockEnhancement({
  editorRef,
  onChangeRef,
  blockIdRef,
}: UseBlockEnhancementOptions): UseBlockEnhancementReturn {
  const [isEnhancing, setIsEnhancing] = useState(false)

  // Snapshot of content before enhance started — used to revert on error/cancel.
  const originalTextRef = useRef<string>('')
  // Buffer that accumulates all streamed tokens as raw markdown.
  const streamBufferRef = useRef<string>('')
  // Track last applied streamedContent length to detect new tokens.
  const lastStreamLengthRef = useRef<number>(0)

  const {
    submit,
    cancel,
    status,
    streamedContent,
    reset,
  } = useTaskSubmit<AIEnhanceInput, AIEnhanceOutput>('ai-enhance', { text: '' })

  // ---------------------------------------------------------------------------
  // Stream tokens into the editor
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isEnhancing) return
    if (streamedContent.length <= lastStreamLengthRef.current) return

    const newTokens = streamedContent.slice(lastStreamLengthRef.current)
    lastStreamLengthRef.current = streamedContent.length

    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return

    streamBufferRef.current += newTokens
    ed.commands.setContent(streamBufferRef.current, { emitUpdate: false, contentType: 'markdown' })
  }, [streamedContent, isEnhancing, editorRef])

  // ---------------------------------------------------------------------------
  // React to task lifecycle transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isEnhancing) return

    if (status === 'completed') {
      const ed = editorRef.current
      if (ed && !ed.isDestroyed) {
        onChangeRef.current(blockIdRef.current, ed.getMarkdown())
      }
      setIsEnhancing(false)
      lastStreamLengthRef.current = 0
      reset()
    } else if (status === 'error' || status === 'cancelled') {
      if (status === 'error') {
        console.error('[useBlockEnhancement] Enhance error')
      }
      const ed = editorRef.current
      if (ed && !ed.isDestroyed) {
        ed.commands.setContent(originalTextRef.current, { emitUpdate: false, contentType: 'markdown' })
        onChangeRef.current(blockIdRef.current, originalTextRef.current)
      }
      setIsEnhancing(false)
      lastStreamLengthRef.current = 0
      reset()
    }
  }, [status, isEnhancing, editorRef, onChangeRef, blockIdRef, reset])

  // ---------------------------------------------------------------------------
  // Cancel in-flight task on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (isEnhancing) cancel()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnhancing, cancel])

  // ---------------------------------------------------------------------------
  // handleEnhance
  // ---------------------------------------------------------------------------
  const handleEnhance = useCallback(async (): Promise<void> => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed || isEnhancing) return
    const currentText = ed.getMarkdown()
    if (!currentText.trim()) return

    // Snapshot for potential revert and seed the buffer with existing content
    // so streamed tokens are appended after it.
    originalTextRef.current = currentText
    streamBufferRef.current = currentText
    lastStreamLengthRef.current = 0
    setIsEnhancing(true)

    const taskId = await submit({ text: currentText })
    if (!taskId) {
      // Submit failed — revert.
      ed.commands.setContent(originalTextRef.current, { emitUpdate: false, contentType: 'markdown' })
      onChangeRef.current(blockIdRef.current, originalTextRef.current)
      setIsEnhancing(false)
    }
  }, [editorRef, isEnhancing, submit, onChangeRef, blockIdRef])

  return { isEnhancing, handleEnhance }
}
