/**
 * taskListenerMiddleware — wires up the global IPC task-event subscription so
 * that every event dispatched by the main process is forwarded into the Redux
 * store as a taskEventReceived action.
 *
 * Call setupTaskIpcListener(store) once, immediately after the store is
 * created (in store/index.ts), to replace the former ensureTaskStoreListening()
 * call from the taskStore.ts singleton.
 *
 * The subscription is lazy-guarded: if window.tasksManager.onEvent is not yet
 * available (e.g. preload has not run) the setup call returns without
 * registering anything — the store's initial empty state will remain until
 * the listener is wired.
 */

import type { EnhancedStore } from '@reduxjs/toolkit'
import type { TaskEvent } from '../../../shared/types'
import { taskEventReceived } from './tasksSlice'

let initialized = false

/**
 * Subscribe to window.tasksManager.onEvent and forward every incoming IPC
 * task event to the Redux store via taskEventReceived.
 *
 * Safe to call multiple times — only the first call registers the listener.
 */
export function setupTaskIpcListener(store: EnhancedStore): void {
  if (initialized) return
  if (typeof window.tasksManager?.onEvent !== 'function') return

  initialized = true

  window.tasksManager.onEvent((event: TaskEvent) => {
    store.dispatch(taskEventReceived(event))
  })
}
