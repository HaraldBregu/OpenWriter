/**
 * EnhancementContext — app-root-level provider for AI block enhancement.
 *
 * Motivation
 * ----------
 * The previous implementation stored enhancement state (enhancingBlockIds,
 * streamingEntries) and task subscriptions inside `usePageEnhancement`, which
 * lives in `ContentPage`. When the user navigates away, ContentPage unmounts,
 * its cleanup effect cancels all in-flight tasks, and streaming progress is
 * lost.
 *
 * Solution
 * --------
 * This provider lives at the app root and NEVER unmounts on navigation.
 * Enhancement state is stored in Redux (serialisable, survives navigation).
 * Non-serialisable task subscriptions live in a ref on this provider.
 * The provider exposes a single `startEnhancement` function via context.
 */

import React, { createContext, useContext, useRef } from 'react'
import { useAppDispatch } from '../store'
import { useTaskContext } from '@/contexts/TaskContext'
import type { TrackedTaskState } from '@/contexts/TaskContext'
import {
  markEnhancing,
  updateStreamingEntry,
  clearEnhancingBlock,
} from '../store/enhancementSlice'
import { updateBlockContent } from '../store/writingItemsSlice'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StartEnhancementInput {
  blockId: string
  entryId: string
  text: string
}

interface EnhancementContextValue {
  startEnhancement: (input: StartEnhancementInput) => Promise<void>
}

/** Internal metadata tracked per active enhancement — never stored in Redux. */
interface BlockEnhanceMeta {
  taskId: string
  originalText: string
  entryId: string
  unsub: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const EnhancementContext = createContext<EnhancementContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Terminal status guard
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(['completed', 'error', 'cancelled'])

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface EnhancementProviderProps {
  children: React.ReactNode
}

/**
 * EnhancementProvider must be placed:
 *   - INSIDE  <Provider store={store}>   (needs Redux dispatch)
 *   - INSIDE  <TaskProvider>             (needs TaskStore)
 *   - OUTSIDE the router / page tree    (must never unmount on navigation)
 *
 * It exposes `startEnhancement` which submits an AI task, tracks it via the
 * shared TaskStore, and writes streaming / terminal state to Redux.  Because
 * this provider never unmounts, tasks run to completion even when the user
 * navigates away from ContentPage mid-stream.
 */
export function EnhancementProvider({ children }: EnhancementProviderProps): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { store } = useTaskContext()

  /**
   * Non-serialisable per-block metadata (taskId, originalText, entryId,
   * unsubscribe fn).  Stored in a ref to avoid causing re-renders and because
   * Redux cannot hold functions.
   */
  const blockMapRef = useRef<Map<string, BlockEnhanceMeta>>(new Map())

  // -------------------------------------------------------------------------
  // startEnhancement
  // -------------------------------------------------------------------------
  const startEnhancement = React.useCallback(
    async ({ blockId, entryId, text }: StartEnhancementInput): Promise<void> => {
      // 1. Per-block guard: do nothing if this block is already enhancing.
      if (blockMapRef.current.has(blockId)) return

      // 2. Content guard: skip empty blocks.
      if (!text.trim()) return

      // 3. Bridge guard.
      if (typeof window.tasksManager?.submit !== 'function') {
        console.warn('[EnhancementContext] window.tasksManager.submit is not available.')
        return
      }

      // 4. Optimistically mark the block as enhancing in Redux.
      dispatch(markEnhancing(blockId))

      // Snapshot original text so we can revert on error / cancel.
      const originalText = text

      // 5. Submit the task via IPC.
      let taskId: string
      try {
        const ipcResult = await window.tasksManager.submit('ai-enhance', { text })
        if (!ipcResult.success) {
          console.error(
            '[EnhancementContext] Submit failed for block',
            blockId,
            ipcResult.error?.message,
          )
          dispatch(clearEnhancingBlock(blockId))
          return
        }
        taskId = ipcResult.data.taskId
      } catch (err) {
        console.error('[EnhancementContext] Submit threw for block', blockId, err)
        dispatch(clearEnhancingBlock(blockId))
        return
      }

      // 6. Register the task in the shared store before subscribing so we
      //    don't miss events that arrive between the IPC round-trip and the
      //    subscription being live.
      store.addTask(taskId, 'ai-enhance', 'normal')

      // Accumulator for streaming tokens — seeded with the original text so
      // that the first token is appended to something meaningful.
      const streamBuffer = { value: originalText }

      // -----------------------------------------------------------------------
      // Per-task subscription — fires synchronously on every store mutation
      // for this specific taskId (zero cross-task re-renders).
      // -----------------------------------------------------------------------
      const unsub = store.subscribe(taskId, () => {
        const snap: TrackedTaskState | undefined = store.getTaskSnapshot(taskId)
        if (!snap) return

        if (snap.streamedContent) {
          streamBuffer.value = originalText + snap.streamedContent
          dispatch(
            updateStreamingEntry({ blockId, content: streamBuffer.value }),
          )
        }

        if (snap.status === 'completed') {
          dispatch(
            updateBlockContent({ entryId, blockId, content: streamBuffer.value }),
          )
          cleanup(blockId)
        } else if (snap.status === 'error') {
          console.error('[EnhancementContext] Enhance error for block', blockId, snap.error)
          dispatch(updateBlockContent({ entryId, blockId, content: originalText }))
          cleanup(blockId)
        } else if (snap.status === 'cancelled') {
          dispatch(updateBlockContent({ entryId, blockId, content: originalText }))
          cleanup(blockId)
        }
      })

      // 7. Store the entry so duplicates can be guarded and the unsub retained.
      blockMapRef.current.set(blockId, { taskId, originalText, entryId, unsub })

      // 8. Replay early snapshot in case the task resolved before subscribe()
      //    completed (e.g. an event arrived during the IPC round-trip).
      const earlySnap = store.getTaskSnapshot(taskId)
      if (earlySnap && TERMINAL_STATUSES.has(earlySnap.status)) {
        if (earlySnap.status === 'completed') {
          const finalContent = originalText + (earlySnap.streamedContent ?? '')
          dispatch(updateBlockContent({ entryId, blockId, content: finalContent }))
        } else {
          dispatch(updateBlockContent({ entryId, blockId, content: originalText }))
        }
        cleanup(blockId)
      }
    },
    // dispatch and store are stable references — no array churn on re-renders.
    [dispatch, store],
  )

  // -------------------------------------------------------------------------
  // cleanup helper — defined with function declaration so it is hoisted and
  // accessible inside the subscribe callback above (which is a closure).
  // -------------------------------------------------------------------------
  function cleanup(blockId: string): void {
    const meta = blockMapRef.current.get(blockId)
    if (meta) {
      meta.unsub()
      blockMapRef.current.delete(blockId)
    }
    dispatch(clearEnhancingBlock(blockId))
  }

  const contextValue = React.useMemo(
    () => ({ startEnhancement }),
    [startEnhancement],
  )

  return (
    <EnhancementContext.Provider value={contextValue}>
      {children}
    </EnhancementContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useEnhancementContext — returns the `startEnhancement` function exposed by
 * EnhancementProvider.  Throws if used outside the provider.
 */
export function useEnhancementContext(): EnhancementContextValue {
  const ctx = useContext(EnhancementContext)
  if (ctx === undefined) {
    throw new Error(
      'useEnhancementContext must be used within an <EnhancementProvider>. ' +
        'Wrap your application root with <EnhancementProvider> (inside <Provider store> and <TaskProvider>).',
    )
  }
  return ctx
}
