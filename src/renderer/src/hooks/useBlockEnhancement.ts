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

export interface UsePageEnhancementOptions {
  /**
   * Stable ref to the onChange callback used to sync block state after
   * enhancement completes or is reverted.
   *
   * Signature: (blockId: string, content: string) => void
   */
  onChangeRef: React.RefObject<(blockId: string, content: string) => void>
  /**
   * Map of blockId -> MutableRefObject<Editor | null>.
   * The parent page populates this map via the onEditorReady callback that
   * each ContentBlock calls when its TipTap editor is initialised.
   */
  editorRefs: React.RefObject<Map<string, React.MutableRefObject<Editor | null>>>
}

export interface UsePageEnhancementReturn {
  /**
   * The block ID that is currently being enhanced, or null when idle.
   * ContentBlock uses this to show the loading state for the matching block.
   */
  enhancingBlockId: string | null
  /**
   * Trigger AI enhancement for the given block.
   * No-ops when: another block is already being enhanced, the editor for this
   * block is not registered / is destroyed, or the block content is empty.
   */
  handleEnhance: (blockId: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the full AI enhancement lifecycle at the page level, decoupled from
 * individual ContentBlock instances.
 *
 * Flow:
 *   1. NewWritingPage collects TipTap editor refs from each ContentBlock via the
 *      onEditorReady(blockId, editor) prop. These refs are stored in a Map and
 *      passed to this hook via `editorRefs`.
 *   2. When the user clicks "Enhance" inside a ContentBlock, the block calls
 *      onEnhance(blockId). NewWritingPage forwards this to handleEnhance(blockId).
 *   3. The hook looks up the editor for that block, snapshots the content, sets
 *      enhancingBlockId, and submits the 'ai-enhance' task.
 *   4. Streamed tokens are written directly into the target editor.
 *   5. On completion the parent onChange is called to sync Redux state.
 *   6. On error / cancel the editor is reverted to the pre-enhance snapshot.
 *   7. Any in-flight task is cancelled on hook unmount.
 *
 * Only one block can be enhanced at a time. Concurrent calls are ignored.
 */
export function usePageEnhancement({
  onChangeRef,
  editorRefs,
}: UsePageEnhancementOptions): UsePageEnhancementReturn {
  const [enhancingBlockId, setEnhancingBlockId] = useState<string | null>(null)

  // Snapshot of content before enhance started — used to revert on error/cancel.
  const originalTextRef = useRef<string>('')
  // Buffer that accumulates all streamed tokens as raw markdown.
  const streamBufferRef = useRef<string>('')
  // Track last applied streamedContent length to detect new tokens.
  const lastStreamLengthRef = useRef<number>(0)
  // Stable ref to the block ID being enhanced (avoids stale closure in effects).
  const enhancingBlockIdRef = useRef<string | null>(null)

  const {
    submit,
    cancel,
    status,
    streamedContent,
    reset,
  } = useTaskSubmit<AIEnhanceInput, AIEnhanceOutput>('ai-enhance', { text: '' })

  // Keep ref in sync so effects that read enhancingBlockIdRef are never stale.
  useEffect(() => {
    enhancingBlockIdRef.current = enhancingBlockId
  }, [enhancingBlockId])

  // ---------------------------------------------------------------------------
  // Helper: look up the editor for a given block ID
  // ---------------------------------------------------------------------------
  const getEditor = useCallback(
    (blockId: string): Editor | null => {
      const editorRef = editorRefs.current?.get(blockId)
      return editorRef?.current ?? null
    },
    [editorRefs],
  )

  // ---------------------------------------------------------------------------
  // Stream tokens into the editor
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enhancingBlockId) return
    if (streamedContent.length <= lastStreamLengthRef.current) return

    const newTokens = streamedContent.slice(lastStreamLengthRef.current)
    lastStreamLengthRef.current = streamedContent.length

    const ed = getEditor(enhancingBlockId)
    if (!ed || ed.isDestroyed) return

    streamBufferRef.current += newTokens
    ed.commands.setContent(streamBufferRef.current, { emitUpdate: false, contentType: 'markdown' })
  }, [streamedContent, enhancingBlockId, getEditor])

  // ---------------------------------------------------------------------------
  // React to task lifecycle transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enhancingBlockId) return

    if (status === 'completed') {
      const ed = getEditor(enhancingBlockId)
      if (ed && !ed.isDestroyed) {
        onChangeRef.current(enhancingBlockId, ed.getMarkdown())
      }
      setEnhancingBlockId(null)
      lastStreamLengthRef.current = 0
      reset()
    } else if (status === 'error' || status === 'cancelled') {
      if (status === 'error') {
        console.error('[usePageEnhancement] Enhance error for block', enhancingBlockId)
      }
      const ed = getEditor(enhancingBlockId)
      if (ed && !ed.isDestroyed) {
        ed.commands.setContent(originalTextRef.current, { emitUpdate: false, contentType: 'markdown' })
        onChangeRef.current(enhancingBlockId, originalTextRef.current)
      }
      setEnhancingBlockId(null)
      lastStreamLengthRef.current = 0
      reset()
    }
  }, [status, enhancingBlockId, getEditor, onChangeRef, reset])

  // ---------------------------------------------------------------------------
  // Cancel in-flight task on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (enhancingBlockIdRef.current) cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancel])

  // ---------------------------------------------------------------------------
  // handleEnhance
  // ---------------------------------------------------------------------------
  const handleEnhance = useCallback(
    async (blockId: string): Promise<void> => {
      // Only one block at a time.
      if (enhancingBlockId) return

      const ed = getEditor(blockId)
      if (!ed || ed.isDestroyed) return

      const currentText = ed.getMarkdown()
      if (!currentText.trim()) return

      // Snapshot for potential revert; seed the buffer so streamed tokens
      // are appended after the current content.
      originalTextRef.current = currentText
      streamBufferRef.current = currentText
      lastStreamLengthRef.current = 0
      setEnhancingBlockId(blockId)

      const taskId = await submit({ text: currentText })
      if (!taskId) {
        // Submit failed — revert immediately.
        if (!ed.isDestroyed) {
          ed.commands.setContent(originalTextRef.current, { emitUpdate: false, contentType: 'markdown' })
          onChangeRef.current(blockId, originalTextRef.current)
        }
        setEnhancingBlockId(null)
      }
    },
    [enhancingBlockId, getEditor, submit, onChangeRef],
  )

  return { enhancingBlockId, handleEnhance }
}
