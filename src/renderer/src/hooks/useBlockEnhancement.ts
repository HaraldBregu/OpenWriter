import { useState, useEffect, useCallback, useRef } from 'react'
import { useTaskContext } from '@/contexts/TaskContext'
import type { TrackedTaskState } from '@/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal per-block tracking metadata — stored in a ref, never causes re-renders. */
interface BlockEnhanceEntry {
  taskId: string
  originalText: string
  streamBuffer: string
  unsub: () => void
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
   * Set of block IDs that are currently being enhanced.
   * ContentBlock uses this to show the loading state for each matching block.
   */
  enhancingBlockIds: Set<string>
  /**
   * Live streaming content keyed by block ID.
   * Pass `streamingEntries.get(block.id)` directly to the target AppTextEditor
   * as `streamingContent` so tokens render without going through Redux.
   */
  streamingEntries: Map<string, string>
  /**
   * Trigger AI enhancement for the given block.
   * No-ops only if that specific block is already being enhanced.
   * Multiple different blocks can enhance concurrently.
   */
  handleEnhance: (blockId: string) => Promise<void>
}

// Terminal statuses — the task will not transition further.
const TERMINAL_STATUSES = new Set(['completed', 'error', 'cancelled'])

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages parallel AI enhancement of multiple content blocks simultaneously.
 *
 * Flow (per block):
 *   1. handleEnhance(blockId) snapshots the block's current content via
 *      getBlockContent, then calls window.tasksManager.submit imperatively.
 *   2. After a taskId is returned, the block is registered in the TaskStore
 *      and a per-task subscription is opened.
 *   3. Streamed tokens are accumulated in the per-block `streamBuffer` and
 *      written to `streamingEntries` React state (Map<blockId, content>).
 *      Only the affected ContentBlock re-renders on each token.
 *   4. On completion the final buffer content is committed via onChangeRef
 *      in a single call, then the block is removed from tracking.
 *   5. On error or cancel the block is reverted to its pre-enhance snapshot
 *      via onChangeRef, then removed from tracking.
 *   6. On unmount all in-flight tasks are cancelled.
 *
 * Multiple blocks can be enhanced concurrently — each has its own isolated
 * task subscription so token events for block-A never re-render block-B.
 */
export function usePageEnhancement({
  onChangeRef,
  getBlockContent,
}: UsePageEnhancementOptions): UsePageEnhancementReturn {
  const { store } = useTaskContext()

  // React state — drives re-renders in ContentBlock components.
  const [enhancingBlockIds, setEnhancingBlockIds] = useState<Set<string>>(new Set())
  const [streamingEntries, setStreamingEntries] = useState<Map<string, string>>(new Map())

  // Per-block internal metadata — stored in a ref so mutations are synchronous
  // and never trigger unnecessary re-renders.
  // Map<blockId, BlockEnhanceEntry>
  const blockMapRef = useRef<Map<string, BlockEnhanceEntry>>(new Map())

  // ---------------------------------------------------------------------------
  // Cleanup helper — removes a block from all tracking state.
  // Must be called after the final onChangeRef.current() so the block's last
  // content is committed before the streaming slot is cleared.
  // ---------------------------------------------------------------------------
  const cleanupBlock = useCallback((blockId: string) => {
    const entry = blockMapRef.current.get(blockId)
    if (entry) {
      entry.unsub()
      blockMapRef.current.delete(blockId)
    }

    setEnhancingBlockIds((prev) => {
      if (!prev.has(blockId)) return prev
      const next = new Set(prev)
      next.delete(blockId)
      return next
    })

    setStreamingEntries((prev) => {
      if (!prev.has(blockId)) return prev
      const next = new Map(prev)
      next.delete(blockId)
      return next
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Cancel all in-flight tasks on unmount.
  // Snapshot the blockMap into a local const so the cleanup closure doesn't
  // close over the ref object itself (which stays stable regardless).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const blockMap = blockMapRef.current
    return () => {
      if (typeof window.tasksManager?.cancel !== 'function') return
      blockMap.forEach((entry) => {
        entry.unsub()
        window.tasksManager.cancel(entry.taskId).catch(() => {
          // Best-effort — the cancelled event will tidy up any store entries.
        })
      })
      blockMap.clear()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // handleEnhance
  // ---------------------------------------------------------------------------
  const handleEnhance = useCallback(
    async (blockId: string): Promise<void> => {
      // Per-block guard — no-op if this specific block is already enhancing.
      if (blockMapRef.current.has(blockId)) return

      const currentText = getBlockContent.current(blockId)
      if (!currentText.trim()) return

      if (typeof window.tasksManager?.submit !== 'function') {
        console.warn('[usePageEnhancement] window.tasksManager.submit is not available.')
        return
      }

      // Mark block as enhancing immediately so the UI disables the editor.
      setEnhancingBlockIds((prev) => new Set(prev).add(blockId))

      // Snapshot original text for potential revert.
      const originalText = currentText

      let taskId: string

      try {
        const ipcResult = await window.tasksManager.submit('ai-enhance', { text: currentText })

        if (!ipcResult.success) {
          console.error('[usePageEnhancement] Submit failed for block', blockId, ipcResult.error?.message)
          // Clear the optimistic enhancing flag — submit never started a task.
          setEnhancingBlockIds((prev) => {
            const next = new Set(prev)
            next.delete(blockId)
            return next
          })
          return
        }

        taskId = ipcResult.data.taskId
      } catch (err) {
        console.error('[usePageEnhancement] Submit threw for block', blockId, err)
        setEnhancingBlockIds((prev) => {
          const next = new Set(prev)
          next.delete(blockId)
          return next
        })
        return
      }

      // Seed the stream buffer with the original content so early tokens are
      // appended to something meaningful (matching the previous single-block logic).
      const streamBuffer = { value: originalText }

      // Register the task in the shared store before subscribing so no events
      // are dropped between the IPC round-trip and the subscription being live.
      store.addTask(taskId, 'ai-enhance', 'normal')

      // ---------------------------------------------------------------------------
      // Per-task store subscription — runs synchronously on every store mutation
      // for this specific taskId (zero cross-task re-renders guaranteed by the
      // TaskStore's per-key subscription model).
      // ---------------------------------------------------------------------------
      const unsub = store.subscribe(taskId, () => {
        const snap: TrackedTaskState | undefined = store.getTaskSnapshot(taskId)
        if (!snap) return

        if (snap.streamedContent) {
          // The store accumulates ALL tokens. Compute the buffer by seeding it
          // with the original text once and appending incremental tokens via the
          // store's full streamedContent string (simpler than a delta cursor).
          streamBuffer.value = originalText + snap.streamedContent

          setStreamingEntries((prev) => {
            const next = new Map(prev)
            next.set(blockId, streamBuffer.value)
            return next
          })
        }

        if (snap.status === 'completed') {
          // Commit the final streamed content to Redux in a single dispatch.
          onChangeRef.current(blockId, streamBuffer.value)
          cleanupBlock(blockId)
        } else if (snap.status === 'error') {
          console.error('[usePageEnhancement] Enhance error for block', blockId, snap.error)
          // Revert the block to its pre-enhance content.
          onChangeRef.current(blockId, originalText)
          cleanupBlock(blockId)
        } else if (snap.status === 'cancelled') {
          // Revert on cancel.
          onChangeRef.current(blockId, originalText)
          cleanupBlock(blockId)
        }
      })

      // Store the entry so we can cancel/cleanup on unmount or duplicate calls.
      blockMapRef.current.set(blockId, {
        taskId,
        originalText,
        streamBuffer: streamBuffer.value,
        unsub,
      })

      // Replay any events that were applied to the store before subscribe() ran
      // (e.g. if the queued event arrived before the subscription was set up).
      const earlySnap = store.getTaskSnapshot(taskId)
      if (earlySnap && TERMINAL_STATUSES.has(earlySnap.status)) {
        // Task already finished by the time we subscribed — trigger cleanup now.
        if (earlySnap.status === 'completed') {
          const finalContent = originalText + earlySnap.streamedContent
          onChangeRef.current(blockId, finalContent)
        } else {
          onChangeRef.current(blockId, originalText)
        }
        cleanupBlock(blockId)
      }
    },
    [store, getBlockContent, onChangeRef, cleanupBlock],
  )

  return { enhancingBlockIds, streamingEntries, handleEnhance }
}
