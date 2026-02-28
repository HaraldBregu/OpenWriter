import { useState, useEffect, useCallback, useRef } from 'react'
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
   * Stable ref to the onChange callback used to sync block content during
   * streaming and after enhancement completes or is reverted.
   *
   * Signature: (blockId: string, content: string) => void
   */
  onChangeRef: React.RefObject<(blockId: string, content: string) => void>
  /**
   * Stable ref to a function that returns the current content for a block.
   * Used to snapshot content before enhancement starts.
   *
   * Signature: (blockId: string) => string
   */
  getBlockContent: React.RefObject<(blockId: string) => string>
}

export interface UsePageEnhancementReturn {
  /**
   * The block ID that is currently being enhanced, or null when idle.
   * ContentBlock uses this to show the loading state for the matching block.
   */
  enhancingBlockId: string | null
  /**
   * Trigger AI enhancement for the given block.
   * No-ops when another block is already being enhanced or block content is empty.
   */
  handleEnhance: (blockId: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the full AI enhancement lifecycle at the page level.
 *
 * Flow:
 *   1. handleEnhance(blockId) snapshots the block's current content via
 *      getBlockContent, then submits the 'ai-enhance' task.
 *   2. Streamed tokens are written back through onChangeRef → Redux state →
 *      block.content prop → AppTextEditor value → TipTap internal sync.
 *      The target block's AppTextEditor is disabled during this phase so no
 *      user edits interfere with the stream.
 *   3. On completion the final content is already in Redux state — no extra
 *      sync needed.
 *   4. On error / cancel the block is reverted to the pre-enhance snapshot
 *      via onChangeRef.
 *   5. Any in-flight task is cancelled on hook unmount.
 *
 * Only one block can be enhanced at a time. Concurrent calls are ignored.
 */
export function usePageEnhancement({
  onChangeRef,
  getBlockContent,
}: UsePageEnhancementOptions): UsePageEnhancementReturn {
  const [enhancingBlockId, setEnhancingBlockId] = useState<string | null>(null)

  // Snapshot of content before enhance started — used to revert on error/cancel.
  const originalTextRef = useRef<string>('')
  // Accumulates all streamed tokens (seeded with original content).
  const streamBufferRef = useRef<string>('')
  // Tracks how many characters of streamedContent have been consumed.
  const lastStreamLengthRef = useRef<number>(0)
  // Stable ref to the block ID being enhanced (avoids stale closure in cleanup).
  const enhancingBlockIdRef = useRef<string | null>(null)

  const {
    submit,
    cancel,
    status,
    streamedContent,
    reset,
  } = useTaskSubmit<AIEnhanceInput, AIEnhanceOutput>('ai-enhance', { text: '' })

  // Keep ref in sync so the unmount cleanup always sees the current value.
  useEffect(() => {
    enhancingBlockIdRef.current = enhancingBlockId
  }, [enhancingBlockId])

  // ---------------------------------------------------------------------------
  // Stream tokens → Redux state → AppTextEditor value prop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enhancingBlockId) return
    if (streamedContent.length <= lastStreamLengthRef.current) return

    const newTokens = streamedContent.slice(lastStreamLengthRef.current)
    lastStreamLengthRef.current = streamedContent.length

    streamBufferRef.current += newTokens
    onChangeRef.current(enhancingBlockId, streamBufferRef.current)
  }, [streamedContent, enhancingBlockId, onChangeRef])

  // ---------------------------------------------------------------------------
  // React to task lifecycle transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enhancingBlockId) return

    if (status === 'completed') {
      // Content is already committed to Redux via the streaming effect above.
      setEnhancingBlockId(null)
      lastStreamLengthRef.current = 0
      reset()
    } else if (status === 'error' || status === 'cancelled') {
      if (status === 'error') {
        console.error('[usePageEnhancement] Enhance error for block', enhancingBlockId)
      }
      // Revert the block to its pre-enhance content.
      onChangeRef.current(enhancingBlockId, originalTextRef.current)
      setEnhancingBlockId(null)
      lastStreamLengthRef.current = 0
      reset()
    }
  }, [status, enhancingBlockId, onChangeRef, reset])

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

      const currentText = getBlockContent.current(blockId)
      if (!currentText.trim()) return

      // Snapshot for potential revert; seed the buffer so streamed tokens
      // are appended to (or replace) the current content.
      originalTextRef.current = currentText
      streamBufferRef.current = currentText
      lastStreamLengthRef.current = 0
      setEnhancingBlockId(blockId)

      const taskId = await submit({ text: currentText })
      if (!taskId) {
        // Submit failed — revert immediately.
        onChangeRef.current(blockId, originalTextRef.current)
        setEnhancingBlockId(null)
      }
    },
    [enhancingBlockId, getBlockContent, submit, onChangeRef],
  )

  return { enhancingBlockId, handleEnhance }
}
