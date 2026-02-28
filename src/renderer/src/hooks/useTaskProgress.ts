import { useCallback } from 'react'
import { useSyncExternalStore } from 'react'
import type { TaskStatus } from '@/contexts/TaskContext'
import { useTaskContext } from '@/contexts/TaskContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTaskProgressReturn {
  /** 0–100 completion percentage. */
  percent: number
  /** Optional human-readable progress message from the main process. */
  message: string | undefined
  /** Optional structured detail payload from the progress event. */
  detail: unknown
  /** Current lifecycle status of the task. */
  status: TaskStatus | 'unknown'
  /** Cancel the tracked task. No-op if the task is already terminal. */
  cancel: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskProgress — fine-grained, render-efficient hook for tracking
 * progress of a single known task. Uses useSyncExternalStore so only this
 * component re-renders when this specific task's progress changes — not all
 * consumers of the shared store.
 *
 * @param taskId The ID of the task to track.
 *
 * Usage:
 *   const { percent, message, status, cancel } = useTaskProgress(taskId)
 */
export function useTaskProgress(taskId: string): UseTaskProgressReturn {
  const { store } = useTaskContext()

  // Subscribe only to this task's key — zero cross-task re-renders.
  const snapshot = useSyncExternalStore(
    useCallback((listener) => store.subscribe(taskId, listener), [store, taskId]),
    useCallback(() => store.getTaskSnapshot(taskId), [store, taskId])
  )

  const cancel = useCallback(async (): Promise<void> => {
    if (typeof window.tasksManager?.cancel !== 'function') return

    const snap = store.getTaskSnapshot(taskId)
    if (!snap || snap.status === 'completed' || snap.status === 'cancelled' || snap.status === 'error') {
      return
    }

    try {
      await window.tasksManager.cancel(taskId)
    } catch {
      // Best-effort — the task:event listener will handle the cancelled status
      // when the main process confirms.
    }
  }, [store, taskId])

  if (!snapshot) {
    return { percent: 0, message: undefined, detail: undefined, status: 'unknown', cancel }
  }

  return {
    percent: snapshot.progress.percent,
    message: snapshot.progress.message,
    detail: snapshot.progress.detail,
    status: snapshot.status,
    cancel,
  }
}
