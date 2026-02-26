import { useState, useEffect, useCallback, useRef } from 'react'
import { type Editor } from '@tiptap/core'
import { useTask } from '@/hooks/useTask'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
 *   1. Submits an 'ai-enhance' task via window.task
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
  // Tracked in state so useEffect dependency arrays stay reactive.
  const [enhanceTaskId, setEnhanceTaskId] = useState<string | null>(null)

  // Snapshot of content before enhance started — used to revert on error/cancel.
  const originalTextRef = useRef<string>('')

  const { submitTask, cancelTask, tasks } = useTask()

  // ---------------------------------------------------------------------------
  // Stream tokens into the editor
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enhanceTaskId) return
    if (!window.task) return
    const unsub = window.task.onEvent((event) => {
      if (event.type !== 'stream') return
      const data = event.data as { taskId: string; token?: string }
      if (data.taskId !== enhanceTaskId) return
      const token = data.token
      if (!token) return
      const ed = editorRef.current
      if (!ed || ed.isDestroyed) return
      // insertContent appends at the current cursor position (end of doc after
      // the separator inserted in handleEnhance).
      ed.commands.insertContent(token)
    })
    return () => unsub()
  }, [enhanceTaskId, editorRef])

  // ---------------------------------------------------------------------------
  // React to task lifecycle transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enhanceTaskId) return
    const taskState = tasks.get(enhanceTaskId)
    if (!taskState) return

    if (taskState.status === 'completed') {
      // Editor already holds the full streamed content — just sync parent state.
      const ed = editorRef.current
      if (ed && !ed.isDestroyed) {
        onChangeRef.current(blockIdRef.current, ed.getMarkdown())
      }
      setIsEnhancing(false)
      setEnhanceTaskId(null)
    } else if (taskState.status === 'error' || taskState.status === 'cancelled') {
      if (taskState.status === 'error') {
        console.error('[useBlockEnhancement] Enhance error:', taskState.error)
      }
      // Revert editor to the text that existed before enhance started.
      const ed = editorRef.current
      if (ed && !ed.isDestroyed) {
        ed.commands.setContent(originalTextRef.current, { emitUpdate: false, contentType: 'markdown' })
        onChangeRef.current(blockIdRef.current, originalTextRef.current)
      }
      setIsEnhancing(false)
      setEnhanceTaskId(null)
    }
  }, [enhanceTaskId, tasks, editorRef, onChangeRef, blockIdRef])

  // ---------------------------------------------------------------------------
  // Cancel in-flight task on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (enhanceTaskId) cancelTask(enhanceTaskId)
    }
  }, [enhanceTaskId, cancelTask])

  // ---------------------------------------------------------------------------
  // handleEnhance
  // ---------------------------------------------------------------------------
  const handleEnhance = useCallback(async (): Promise<void> => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed || isEnhancing) return
    const currentText = ed.getMarkdown()
    if (!currentText.trim()) return

    // Snapshot for potential revert.
    originalTextRef.current = currentText
    setIsEnhancing(true)

    // Move cursor to the end and insert a separator so streamed tokens appear
    // after the original content on a new line.
    ed.commands.focus('end')
    ed.commands.insertContent('\n\n')

    const taskId = await submitTask('ai-enhance', { text: currentText })
    if (taskId) {
      setEnhanceTaskId(taskId)
    } else {
      // Submit failed — revert the separator we just inserted.
      ed.commands.setContent(originalTextRef.current, { emitUpdate: false, contentType: 'markdown' })
      onChangeRef.current(blockIdRef.current, originalTextRef.current)
      setIsEnhancing(false)
    }
  }, [editorRef, isEnhancing, submitTask, onChangeRef, blockIdRef])

  return { isEnhancing, handleEnhance }
}
