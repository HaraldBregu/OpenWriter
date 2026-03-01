# Task Manager Architecture (updated Mar 2026)

## Redux Migration (Mar 2026)

The module-level `taskStore.ts` singleton has been fully removed. All task state is now in Redux under `state.tasks`.

### Key files
- `src/renderer/src/store/tasksSlice.ts` — full implementation with actions, reducers, selectors
- `src/renderer/src/store/taskListenerMiddleware.ts` — wires `window.tasksManager.onEvent` → `dispatch(taskEventReceived(event))`
- `src/renderer/src/store/index.ts` — registers `tasksReducer`, calls `setupTaskIpcListener(store)` at module level
- `src/renderer/src/hooks/useTaskSubmit.ts` — uses `useAppDispatch`/`useAppSelector`
- `src/renderer/src/hooks/useDebugTasks.ts` — uses `selectAllTasks`/`selectQueueStats` selectors
- `src/renderer/src/components/withTaskTracking.tsx` — HOC wrapping `useTaskSubmit`
- `src/renderer/src/pages/DebugPage.tsx` — uses `store.dispatch(taskAdded(...))` for demo tasks
- DELETED: `src/renderer/src/services/taskStore.ts`

### tasksSlice exports
```typescript
// Actions
export const { taskAdded, taskEventReceived, taskRemoved } = tasksSlice.actions

// Selectors
export const selectAllTasks: (state: RootState) => TrackedTaskState[]
export const selectTaskById: (state: RootState, taskId: string) => TrackedTaskState | undefined
export const selectTasksByStatus: (state: RootState, status: TaskStatus) => TrackedTaskState[]
export const selectQueueStats: (state: RootState) => { queued: number; running: number; completed: number; error: number; cancelled: number }

// Types
export interface TrackedTaskState { taskId, type, status, priority, progress, queuePosition?, durationMs?, error?, result?, events }
export interface TaskProgressState { percent: number; message?: string; detail?: unknown }
export interface TasksState { tasks: Record<string, TrackedTaskState> } // must be exported to avoid TS4023
```

### useTaskSubmit pattern
- Local state: only `taskId: string | null` (which task this instance owns)
- Redux state: read via `useAppSelector(state => selectTaskById(state, taskId))`
- `status`, `progress`, `error`, `result`, `queuePosition`, `durationMs` all derived from Redux
- On submit: dispatch `taskAdded` BEFORE `setTaskId` so IPC events never arrive before the task is in Redux
- `runningRef` guard released via `useEffect` watching `status` for terminal values
- On reset: dispatch `taskRemoved(id)` then `setTaskId(null)`
- On unmount: best-effort `window.tasksManager?.cancel(id)` if `runningRef.current`
- `cancel()`/`updatePriority()`: synchronous functions (void return), not async — fire-and-forget IPC

### useDebugTasks pattern
- No local `hiddenIds` state — `hide()` dispatches `taskRemoved` which removes from Redux entirely
- `tasks = useAppSelector(selectAllTasks)` — memoised createSelector, only recomputes when tasks map changes
- `queueStats = useAppSelector(selectQueueStats)` — same

### withTaskTracking HOC
- `WithTaskTrackingInjectedProps.taskTracking.submit` has signature `() => Promise<void>` (no input args)
- HOC wraps `hookSubmit` with a `useCallback` that calls `hookSubmit(resolvedInput())` internally
- `status: TaskStatus | null` (was `TaskStatus | 'idle'`)
- `progress: TaskProgressState` (was `number`)
- `error: string | undefined` (was `string | null`)
- `cancel: () => void` (was `() => Promise<void>`)

### TS4023 gotcha
If `TasksState` is private (not exported) in `tasksSlice.ts`, TypeScript will raise TS4023 errors on ALL
other selectors that use RootState, because RootState infers through the tasks reducer and hits the
unexportable `TasksState` name. Fix: always export `TasksState` from `tasksSlice.ts`.

### TaskStatus
```typescript
export type TaskStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
// NO 'paused', NO 'idle' — 'idle' is represented by taskId === null in the hook
```

### IPC bridge
- `taskListenerMiddleware.ts` calls `setupTaskIpcListener(store)` which registers `window.tasksManager.onEvent`
- Called once in `store/index.ts` at module level — no need for `ensureListening()` calls in hooks
- `taskEventBus.ts` is a separate service for AI streaming — leave it alone, it does NOT use the task Redux slice
