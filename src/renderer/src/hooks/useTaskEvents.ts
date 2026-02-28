import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskEvent } from '../../../shared/types/ipc/types'
import type { TaskEventRecord } from '@/services/taskStore'
import { taskStore } from '@/services/taskStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTaskEventsReturn {
  /** Bounded ring of recent task events (max 50). */
  events: TaskEventRecord[]
  /** The most recently received event, or null if none yet. */
  latest: TaskEventRecord | null
  /** Clears the local event history. Does not affect the store. */
  clear: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTaskEvents — subscribes to task events, optionally scoped to a single
 * task by providing a taskId. Maintains a local bounded history (max 50
 * entries) for display and debugging.
 *
 * When taskId is undefined, all task events are collected (useful for a
 * global activity feed or debugging panel).
 *
 * @param taskId Optional task ID to filter events. Omit to receive all events.
 */
export function useTaskEvents(taskId?: string): UseTaskEventsReturn {
  taskStore.ensureListening()

  const [events, setEvents] = useState<TaskEventRecord[]>([])
  const latestRef = useRef<TaskEventRecord | null>(null)

  // Keep taskId stable in a ref so the IPC callback never goes stale.
  const taskIdRef = useRef<string | undefined>(taskId)
  taskIdRef.current = taskId

  // When taskId changes, read the existing event history from the store
  // and hydrate local state so the caller sees events from before mount.
  useEffect(() => {
    if (taskId) {
      const snap = taskStore.getTaskSnapshot(taskId)
      if (snap) {
        setEvents(snap.events)
        latestRef.current = snap.events[snap.events.length - 1] ?? null
      } else {
        setEvents([])
        latestRef.current = null
      }
    } else {
      setEvents([])
      latestRef.current = null
    }
  }, [taskId])

  // Subscribe to the store for ongoing event updates.
  useEffect(() => {
    const subscriptionKey = taskId ?? 'ALL'

    const unsub = taskStore.subscribe(subscriptionKey, () => {
      if (taskIdRef.current) {
        const snap = taskStore.getTaskSnapshot(taskIdRef.current)
        if (snap) {
          setEvents(snap.events)
          latestRef.current = snap.events[snap.events.length - 1] ?? null
        }
      } else {
        // Global mode: handled by the separate IPC effect below.
      }
    })

    return unsub
  }, [taskId])

  // For the global (taskId-less) mode, maintain a separate IPC listener to
  // collect all events across all tasks.
  useEffect(() => {
    if (taskId) return // task-scoped mode uses the store subscription above

    if (typeof window.tasksManager?.onEvent !== 'function') return

    const MAX = 50

    const unsub = window.tasksManager.onEvent((event: TaskEvent) => {
      const data = event.data as { taskId: string }
      const record: TaskEventRecord = {
        type: event.type,
        data: event.data,
        receivedAt: Date.now(),
      }
      setEvents((prev) => {
        const next = prev.length >= MAX ? [...prev.slice(1), record] : [...prev, record]
        latestRef.current = record
        return next
      })
      // Suppress unused variable — data is used for the taskId type check above
      void data
    })

    return () => unsub()
  }, [taskId])

  const clear = useCallback(() => {
    setEvents([])
    latestRef.current = null
  }, [])

  const latest = events.length > 0 ? events[events.length - 1] : null

  return { events, latest, clear }
}
