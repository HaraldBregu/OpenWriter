import { useCallback } from 'react'
import { useSyncExternalStore } from 'react'
import { taskStore } from '@/services/taskStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTaskStreamReturn {
  /** Full accumulated text from all 'stream' token events received so far. */
  content: string
  /** True while the task is in 'running' status and tokens are being received. */
  isStreaming: boolean
  /** True when the task has completed (all tokens received). */
  isDone: boolean
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskStream — specialized hook for consuming a streaming task's token
 * output. Uses useSyncExternalStore keyed to a single task, meaning only
 * this component re-renders on each token — other task observers are unaffected.
 *
 * The accumulated content is read directly from the taskStore snapshot rather
 * than maintained as separate local state, avoiding double-write patterns.
 *
 * @param taskId The ID of the streaming task to observe.
 */
export function useTaskStream(taskId: string): UseTaskStreamReturn {
  taskStore.ensureListening()

  // Subscribe only to this task's key so only this component re-renders
  // when a new stream token arrives.
  const snapshot = useSyncExternalStore(
    useCallback((listener) => taskStore.subscribe(taskId, listener), [taskId]),
    useCallback(() => taskStore.getTaskSnapshot(taskId), [taskId])
  )

  const content = snapshot?.streamedContent ?? ''
  const status = snapshot?.status

  return {
    content,
    isStreaming: status === 'running',
    isDone: status === 'completed',
  }
}
