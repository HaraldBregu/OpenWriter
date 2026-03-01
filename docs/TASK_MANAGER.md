# TaskManager System Documentation

Comprehensive documentation for OpenWriter's background task execution system. This system provides priority-based task queuing, concurrent execution, real-time progress streaming, and render-efficient React integration across the Electron main process, IPC layer, and renderer.

---

## Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
  - [Layer Diagram](#layer-diagram)
  - [Key Components](#key-components)
  - [Data Flow](#data-flow)
- [2. Core Concepts](#2-core-concepts)
  - [Task Lifecycle](#task-lifecycle)
  - [Priority System](#priority-system)
  - [Queue Management](#queue-management)
  - [Result Persistence](#result-persistence)
  - [Window Scoping](#window-scoping)
- [3. Public APIs](#3-public-apis)
  - [Main Process API (TaskExecutorService)](#main-process-api-taskexecutorservice)
  - [Preload API (window.task)](#preload-api-windowtask)
  - [React Hooks](#react-hooks)
  - [React Components](#react-components)
- [4. Event System](#4-event-system)
  - [Event Types Reference](#event-types-reference)
  - [Event Flow and Timing](#event-flow-and-timing)
- [5. Type System](#5-type-system)
- [6. Usage Examples](#6-usage-examples)
  - [Example 1: Simple Task Submission](#example-1-simple-task-submission)
  - [Example 2: Streaming AI Task](#example-2-streaming-ai-task)
  - [Example 3: Using withTaskTracking HOC](#example-3-using-withtasktracking-hoc)
  - [Example 4: Manual Task Control](#example-4-manual-task-control)
  - [Example 5: Queue Monitoring Dashboard](#example-5-queue-monitoring-dashboard)
  - [Example 6: Fetching Results After Navigation](#example-6-fetching-results-after-navigation)
- [7. Internals](#7-internals)
  - [Queuing Algorithm](#queuing-algorithm)
  - [Result Persistence](#result-persistence-1)
  - [Event Dispatch](#event-dispatch)
  - [Window Scoping](#window-scoping-1)
  - [Concurrency Model](#concurrency-model)
- [8. Error Handling](#8-error-handling)
- [9. Performance Characteristics](#9-performance-characteristics)
- [10. Security and Best Practices](#10-security-and-best-practices)
- [11. Implementing a Custom Task Handler](#11-implementing-a-custom-task-handler)
- [12. Testing Recommendations](#12-testing-recommendations)
- [13. Common Patterns](#13-common-patterns)
- [14. Using TaskManager from the Main Process (Node.js)](#14-using-taskmanager-from-the-main-process-nodejs)
- [15. Using TaskManager from the Renderer](#15-using-taskmanager-from-the-renderer)
- [16. Task Reaction Layer](#16-task-reaction-layer)

---

## 1. Architecture Overview

### Layer Diagram

```
+-------------------------------------------------------------------------+
|  Renderer Process (React)                                               |
|                                                                         |
|  +-------------------+  +----------------+  +-----------------------+   |
|  | <TaskProvider>     |  | useTaskSubmit  |  | withTaskTracking HOC  |   |
|  |  - single onEvent |  | useTaskProgress|  |  - wraps any component|   |
|  |  - shared store   |  | useTaskStatus  |  |  - injects taskTracking|  |
|  +--------+----------+  | useTaskStream  |  +-----------+-----------+   |
|           |              | useTaskList    |              |               |
|           v              | useTaskQueue   |              |               |
|  +--------+----------+  | useTaskEvents  |              |               |
|  | TaskStore          |  | useTaskResult  |              |               |
|  |  - per-taskId subs |  +-------+--------+              |               |
|  |  - external store  |          |                       |               |
|  +--------+-----------+          |                       |               |
|           |                      |                       |               |
+-----------+----------------------+-----------------------+---------------+
            |                      |                       |
            | events (push)        | IPC invoke/handle     |
            |                      |                       |
+-----------|----------------------+-----------------------+---------------+
|  Preload  |                                                             |
|           v                      |                       |              |
|  +--------+-----------+          |                       |              |
|  | window.task         |<--------+-----------------------+              |
|  |  .submit()          |  typedInvokeRaw (IpcResult envelope)           |
|  |  .cancel()          |                                                |
|  |  .pause()           |  typedOn (task:event push channel)             |
|  |  .resume()          |                                                |
|  |  .updatePriority()  |                                                |
|  |  .list()            |                                                |
|  |  .getResult()       |                                                |
|  |  .queueStatus()     |                                                |
|  |  .onEvent()         |                                                |
|  +---------------------+                                                |
+----------+--------------------------------------------------------------+
           |
           | ipcMain.handle / ipcRenderer.on
           |
+----------v--------------------------------------------------------------+
|  Main Process                                                           |
|                                                                         |
|  +---------------------+     +------------------------+                 |
|  | TaskManagerIpc      |---->| TaskExecutor           |                 |
|  |  - registers IPC    |     |  - queue + concurrency |                 |
|  |  - stamps windowId  |     |  - lifecycle mgmt      |                 |
|  |  - validates input  |     |  - TTL result store    |                 |
|  +---------------------+     +----------+-------------+                 |
|                                         |                               |
|                              +----------v-------------+                 |
|                              | TaskHandlerRegistry    |                 |
|                              |  - type -> handler Map |                 |
|                              +----------+-------------+                 |
|                                         |                               |
|                              +----------v-------------------+           |
|                              | TaskHandler (per type)       |           |
|                              |  execute(input, signal, ...) |           |
|                              +------------------------------+           |
|                                                                         |
|  +---------------------+  emit('task:submitted'|'task:started'|...)     |
|  | EventBus            |<-- TaskExecutor emits AppEvents for            |
|  |  .sendTo(windowId)  |    main-process observers (reaction layer)     |
|  |  .broadcast()       |    AND pushes 'task:event' IPC to renderer     |
|  |  .emit() / .on()    |                                                |
|  +----------+----------+                                                |
|             |                                                           |
|  +----------v----------+     +------------------------+                 |
|  | TaskReactionBus     |---->| TaskReactionRegistry   |                 |
|  |  - subscribes to   |     |  - type -> handler[]   |                 |
|  |    AppEvents        |     |  - wildcard '*' support|                 |
|  |  - fan-out dispatch |     +----------+-------------+                 |
|  |  - error isolation  |                |                               |
|  +---------------------+     +----------v-------------------+           |
|                              | TaskReactionHandler (per type)|          |
|                              |  onSubmitted / onStarted /   |           |
|                              |  onCompleted / onFailed /    |           |
|                              |  onCancelled                 |           |
|                              +------------------------------+           |
+-------------------------------------------------------------------------+
```

### Key Components

| Component | Layer | File | Responsibility |
|-----------|-------|------|----------------|
| `TaskExecutor` | Main | `src/main/taskManager/TaskExecutor.ts` | Orchestrates task execution, queuing, priority ordering, pause/resume, TTL result storage |
| `TaskHandlerRegistry` | Main | `src/main/taskManager/TaskHandlerRegistry.ts` | Maps task type strings to `TaskHandler` instances |
| `TaskHandler` | Main | `src/main/taskManager/TaskHandler.ts` | Interface for task execution logic (`execute`, `validate`, `ProgressReporter`, `StreamReporter`) |
| `TaskReactionBus` | Main | `src/main/taskManager/TaskReactionBus.ts` | Subscribes to `AppEvents` from `EventBus`; fan-outs lifecycle events to registered reaction handlers |
| `TaskReactionRegistry` | Main | `src/main/taskManager/TaskReactionRegistry.ts` | Maps task type strings to `TaskReactionHandler[]`; supports wildcard `'*'` |
| `TaskReactionHandler` | Main | `src/main/taskManager/TaskReactionHandler.ts` | Interface for main-process side-effects on task lifecycle events |
| `TaskManagerIpc` | Main | `src/main/ipc/TaskManagerIpc.ts` | IPC bridge: registers channels, stamps `windowId`, validates priority |
| `EventBus` | Main | `src/main/core/EventBus.ts` | Dual-role: `broadcast/sendTo` for renderer IPC; `emit/on` for main-process `AppEvents` |
| `taskStore` | Renderer | `src/renderer/src/services/taskStore.ts` | Module-level singleton; per-taskId subscriptions via `useSyncExternalStore`; lazy IPC listener init |
| `taskEventBus` | Renderer | `src/renderer/src/services/taskEventBus.ts` | Per-task event pub/sub for streaming content accumulation |
| `useTaskSubmit` | Renderer | `src/renderer/src/hooks/useTaskSubmit.ts` | Full lifecycle hook: submit, cancel, pause, resume, stream |
| `useDebugTasks` | Renderer | `src/renderer/src/hooks/useDebugTasks.ts` | Subscribes to all tracked tasks for the debug page; exposes controls |

### Data Flow

A task submission follows this path:

```
1. Component calls submit() via useTaskSubmit
2. useTaskSubmit calls window.task.submit(type, input, options)
3. Preload invokes typedInvokeRaw(TaskChannels.submit, ...)
4. ipcMain.handle routes to TaskIpc
5. TaskIpc stamps windowId from event.sender.id
6. TaskIpc calls TaskExecutorService.submit()
7. Executor validates input via handler.validate()
8. Executor creates ActiveTask, enqueues, sorts, emits 'queued' event
9. Executor calls drainQueue() -- if slot available, starts execution
10. Handler.execute() runs with AbortSignal, ProgressReporter, StreamReporter
11. Progress/stream events flow: Executor -> EventBus -> preload onEvent -> TaskStore
12. On completion: Executor emits 'completed' event, moves task to TTL store
13. TaskStore updates snapshot, notifies per-taskId subscribers
14. useTaskSubmit syncs local state from store snapshot
15. Component re-renders with new status/result
```

---

## 2. Core Concepts

### Task Lifecycle

Every task progresses through a defined state machine:

```
                  +----------+
     submit() --> | queued   |---+
                  +----+-----+   |
                       |         | pause()
                  drainQueue()   |
                       |         v
                  +----v-----+  +----------+
                  | running  |  | paused   |
                  +----+-----+  +----+-----+
                       |             |
            +----------+------+  resume()
            |          |      |      |
       completed    error   abort    |
            |          |      |      |
            v          v      v      |
     +-----------+ +-------+ +----------+
     | completed | | error | | cancelled|
     +-----------+ +-------+ +----------+
            |          |         |
            +----------+---------+
                       |
                       v
               TTL store (5 min)
                       |
                       v
                   GC evicted
```

**State definitions:**

| Status | Description |
|--------|-------------|
| `queued` | Waiting in the priority queue for an execution slot |
| `paused` | Manually paused while queued; skipped by `drainQueue()` until resumed |
| `running` | Actively executing in a handler |
| `completed` | Handler returned successfully; result is available |
| `error` | Handler threw a non-abort error |
| `cancelled` | Aborted via `cancel()` or window close |

**Constraints:**
- Only `queued` tasks can be paused (running tasks must be cancelled).
- Only `paused` tasks can be resumed.
- Priority can only be updated on `queued` or `paused` tasks.
- Terminal states (`completed`, `error`, `cancelled`) are final.

### Priority System

Tasks are assigned one of three priority levels:

| Priority | Weight | Description |
|----------|--------|-------------|
| `high` | 3 | Executed before all normal and low tasks |
| `normal` | 2 | Default priority |
| `low` | 1 | Executed only when no higher-priority tasks are queued |

Priority affects queue ordering only. Once a task begins running, its priority has no further effect. Priority can be updated at any time while a task is `queued` or `paused`, triggering an immediate queue re-sort.

### Queue Management

The queue is a sorted array of `QueuedTask` entries. Ordering is determined by:

1. **Priority** (descending): high > normal > low
2. **FIFO** (ascending `queuedAt` timestamp): within the same priority, earlier submissions run first

The queue is re-sorted on:
- Task submission (`submit`)
- Priority update (`updatePriority`)
- Task resume (`resume`)

`drainQueue()` is called after every state change that might free an execution slot or add work (submit, resume, priority update, task completion). It iterates the sorted queue, skipping paused tasks, and starts tasks until `maxConcurrency` (default: 5) running tasks is reached.

### Result Persistence

Completed, errored, and cancelled tasks are moved to a TTL-based store for later retrieval:

- **TTL**: 5 minutes (`COMPLETED_TASK_TTL_MS = 300,000 ms`)
- **Garbage collection**: Runs every 60 seconds via `setInterval` (unref'd so it does not prevent process exit)
- **Access**: `getTaskResult(taskId)` checks active tasks first, then the TTL store
- **Purpose**: Allows components that mount after completion (e.g., after navigation) to retrieve results

### Window Scoping

Each task is optionally associated with a `windowId`:

- **Stamping**: `TaskIpc` always overrides `options.windowId` with `event.sender.id` from the IPC event. The renderer cannot spoof this value.
- **Event routing**: When `windowId` is set, events are sent via `EventBus.sendTo(windowId)` to that specific window. When unset, events are broadcast to all windows.
- **Window close cleanup**: `TaskIpc` listens for `window:closed` events and calls `cancelByWindow(windowId)` to abort all tasks owned by the closing window.

---

## 3. Public APIs

### Main Process API (TaskExecutorService)

Located at `src/main/tasks/TaskExecutorService.ts`.

```typescript
class TaskExecutorService implements Disposable {
  /**
   * Submit a task for execution. Returns the taskId immediately.
   * The task is queued by priority and started when a slot is available.
   */
  submit<TInput>(type: string, input: TInput, options?: TaskOptions): string

  /**
   * Cancel a task by ID. Works for both queued and running tasks.
   * Aborts the controller and removes from queue if still queued.
   * Returns true if the task was found and cancelled.
   */
  cancel(taskId: string): boolean

  /**
   * Pause a queued task. Running tasks cannot be paused.
   * The task stays in the queue but is skipped by drainQueue().
   * Returns true if the task was found in queued state and paused.
   */
  pause(taskId: string): boolean

  /**
   * Resume a paused task. Returns it to the priority queue.
   * Returns true if the task was found in paused state and resumed.
   */
  resume(taskId: string): boolean

  /**
   * Update the priority of a queued or paused task.
   * The queue is re-sorted immediately.
   * Returns true if the task was found and its priority updated.
   */
  updatePriority(taskId: string, newPriority: TaskPriority): boolean

  /**
   * Retrieve a task by ID. Checks active tasks first, then TTL store.
   * Returns undefined if unknown or expired.
   */
  getTaskResult(taskId: string): ActiveTask | undefined

  /**
   * Return queue metrics: queued, running, completed counts.
   */
  getQueueStatus(): TaskQueueStatus

  /**
   * List all active tasks (queued + running + paused).
   * Does NOT include completed tasks from the TTL store.
   */
  listTasks(): ActiveTask[]

  /**
   * Cancel all tasks owned by a specific window.
   * Returns the count of cancelled tasks.
   */
  cancelByWindow(windowId: number): number

  /**
   * Abort all active tasks and clean up. Called by ServiceContainer on shutdown.
   */
  destroy(): void
}
```

**TaskOptions:**

```typescript
interface TaskOptions {
  priority?: TaskPriority   // 'low' | 'normal' | 'high' (default: 'normal')
  timeoutMs?: number        // Auto-cancel after N milliseconds (optional)
  windowId?: number         // Set by TaskIpc, not by callers
}
```

### Preload API (window.task)

Located at `src/preload/index.ts` (lines 578-610) and typed in `src/preload/index.d.ts` (lines 257-267).

All methods return `Promise<IpcResult<T>>` (except `onEvent`) where `IpcResult` is:

```typescript
type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string } }
```

```typescript
interface TaskApi {
  /** Submit a task. Returns { taskId: string } on success. */
  submit(type: string, input: unknown, options?: TaskSubmitOptions): Promise<IpcResult<{ taskId: string }>>

  /** Cancel a running or queued task. Returns boolean. */
  cancel(taskId: string): Promise<IpcResult<boolean>>

  /** List all active tasks. Returns TaskInfo[]. */
  list(): Promise<IpcResult<TaskInfo[]>>

  /** Pause a queued task. Returns boolean. */
  pause(taskId: string): Promise<IpcResult<boolean>>

  /** Resume a paused task. Returns boolean. */
  resume(taskId: string): Promise<IpcResult<boolean>>

  /** Update priority of a queued or paused task. Returns boolean. */
  updatePriority(taskId: string, priority: 'low' | 'normal' | 'high'): Promise<IpcResult<boolean>>

  /** Retrieve a completed/errored/cancelled task by ID. Returns TaskInfo or null. */
  getResult(taskId: string): Promise<IpcResult<TaskInfo | null>>

  /** Get queue metrics. Returns { queued, running, completed }. */
  queueStatus(): Promise<IpcResult<TaskQueueStatus>>

  /**
   * Subscribe to task events pushed from the main process.
   * Returns an unsubscribe function.
   */
  onEvent(callback: (event: TaskEvent) => void): () => void
}
```

### React Hooks

All hooks below require a `<TaskProvider>` ancestor in the component tree.

#### useTaskSubmit

The primary hook for submitting and tracking a single task. Located at `src/renderer/src/hooks/useTaskSubmit.ts`.

```typescript
function useTaskSubmit<TInput = unknown, TResult = unknown>(
  type: string,
  input: TInput,
  options?: TaskSubmitOptions
): UseTaskSubmitReturn<TResult>

interface UseTaskSubmitReturn<TResult> {
  taskId: string | null
  status: TaskStatus | 'idle'
  progress: number                   // 0-100
  progressMessage: string | undefined
  error: string | null
  result: TResult | null
  streamedContent: string
  queuePosition: number | undefined
  submit: () => Promise<string | null>
  cancel: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  updatePriority: (priority: TaskPriority) => Promise<void>
  reset: () => void
}
```

#### useTaskProgress

Fine-grained progress tracking for a known taskId. Uses `useSyncExternalStore` for surgical re-renders. Located at `src/renderer/src/hooks/useTaskProgress.ts`.

```typescript
function useTaskProgress(taskId: string): UseTaskProgressReturn

interface UseTaskProgressReturn {
  percent: number              // 0-100
  message: string | undefined  // Human-readable progress message
  detail: unknown              // Structured detail payload
  status: TaskStatus | 'unknown'
  cancel: () => Promise<void>
}
```

#### useTaskStatus

Lightweight status-only subscription. Re-renders only when the status field changes, not on progress ticks or stream tokens. Located at `src/renderer/src/hooks/useTaskStatus.ts`.

```typescript
function useTaskStatus(taskId: string): TaskStatus | 'unknown'
```

#### useTaskStream

Specialized hook for consuming streaming token output from AI tasks. Located at `src/renderer/src/hooks/useTaskStream.ts`.

```typescript
function useTaskStream(taskId: string): UseTaskStreamReturn

interface UseTaskStreamReturn {
  content: string       // Full accumulated text from all stream tokens
  isStreaming: boolean   // True while status is 'running'
  isDone: boolean        // True when status is 'completed'
}
```

#### useTaskList

Subscribes to all active tasks with optional client-side filtering. Fetches initial state from `window.task.list()` on mount. Located at `src/renderer/src/hooks/useTaskList.ts`.

```typescript
function useTaskList(filter?: TaskFilter): UseTaskListReturn

type TaskFilter = (task: TaskInfo) => boolean

interface UseTaskListReturn {
  tasks: TaskInfo[]
  isLoading: boolean
  error: string | null
}
```

#### useTaskQueue

Live view of queued/paused tasks sorted by position plus aggregate queue metrics. Located at `src/renderer/src/hooks/useTaskQueue.ts`.

```typescript
function useTaskQueue(): UseTaskQueueReturn

interface UseTaskQueueReturn {
  queuedTasks: QueuedTaskInfo[]        // Sorted by queuePosition ascending
  queueStatus: TaskQueueStatus | null  // { queued, running, completed }
  isLoading: boolean
  error: string | null
  refreshQueueStatus: () => Promise<void>
}
```

#### useTaskEvents

Bounded event history (max 50) for debugging or activity feeds. Optionally scoped to a single task. Located at `src/renderer/src/hooks/useTaskEvents.ts`.

```typescript
function useTaskEvents(taskId?: string): UseTaskEventsReturn

interface UseTaskEventsReturn {
  events: TaskEventRecord[]
  latest: TaskEventRecord | null
  clear: () => void
}
```

#### useTaskResult

Fetches persisted results via `window.task.getResult()` for tasks that completed before the component mounted. Auto-refetches when the store detects a `completed` transition. Located at `src/renderer/src/hooks/useTaskResult.ts`.

```typescript
function useTaskResult<TResult = unknown>(taskId: string | undefined): UseTaskResultReturn<TResult>

interface UseTaskResultReturn<TResult> {
  taskInfo: TaskInfo | null
  result: TResult | null
  fetchStatus: 'idle' | 'loading' | 'ready' | 'error'
  fetchError: string | null
  refetch: () => Promise<void>
}
```

### React Components

#### TaskProvider

Must be placed once, high in the component tree. Mounts a single global `window.task.onEvent` listener and feeds all events into the shared `TaskStore`.

```tsx
import { TaskProvider } from '@/contexts/TaskContext'

function App() {
  return (
    <TaskProvider>
      <AppLayout />
    </TaskProvider>
  )
}
```

#### withTaskTracking (HOC)

Wraps any component to inject a `taskTracking` prop with full task lifecycle management.

```typescript
function withTaskTracking<TInput, TProps extends WithTaskTrackingInjectedProps>(
  WrappedComponent: React.ComponentType<TProps>,
  config: TaskTrackingConfig<TInput>
): React.ForwardRefExoticComponent<...>

interface TaskTrackingConfig<TInput> {
  type: string
  input: TInput | ((ownProps: Record<string, unknown>) => TInput)
  options?: TaskSubmitOptions
}

interface WithTaskTrackingInjectedProps {
  taskTracking: {
    submit: () => Promise<string | null>
    cancel: () => Promise<void>
    reset: () => void
    status: TaskStatus | 'idle'
    progress: number
    progressMessage: string | undefined
    error: string | null
    result: unknown
    streamedContent: string
    taskId: string | null
  }
}
```

---

## 4. Event System

### Event Types Reference

All events are defined as a discriminated union on the `type` field. Events are pushed from `TaskExecutorService` through the `EventBus` on the `task:event` channel.

| Event Type | Data Fields | Emitted When |
|------------|-------------|--------------|
| `queued` | `taskId`, `position` | Task is added to the queue |
| `started` | `taskId` | Task begins execution (leaves queue) |
| `progress` | `taskId`, `percent`, `message?`, `detail?` | Handler calls `reporter.progress()` |
| `stream` | `taskId`, `token` | Handler calls `streamReporter.stream()` |
| `completed` | `taskId`, `result`, `durationMs` | Handler returns successfully |
| `error` | `taskId`, `message`, `code` | Handler throws a non-abort error |
| `cancelled` | `taskId` | Task is aborted (user cancel, timeout, or window close) |
| `paused` | `taskId` | Task is paused via `pause()` |
| `resumed` | `taskId`, `position` | Task is resumed via `resume()` |
| `priority-changed` | `taskId`, `priority`, `position` | Priority updated via `updatePriority()` |
| `queue-position` | `taskId`, `position` | Queue position changes (reserved for future use) |

### Event Flow and Timing

```
submit() called
  |
  v
[queued] event (position = N)
  |
  v
drainQueue() -- if slot available:
  |
  v
[started] event
  |
  +---> [progress] events (0..N times, throttled by handler)
  |
  +---> [stream] events (0..N times, for AI handlers)
  |
  v
[completed] event (with result + durationMs)
  OR
[error] event (with message + code)
  OR
[cancelled] event (from abort/timeout/window close)
```

**Pause/resume flow:**

```
[queued] --> pause() --> [paused] --> resume() --> [resumed] (position = M) --> [started]
```

**Priority change flow:**

```
[queued] --> updatePriority('high') --> [priority-changed] (priority, position)
```

---

## 5. Type System

All shared types are defined in `src/shared/types/ipc/types.ts`.

### TaskStatus

```typescript
type TaskStatus = 'queued' | 'paused' | 'running' | 'completed' | 'error' | 'cancelled'
```

### TaskPriority

```typescript
type TaskPriority = 'low' | 'normal' | 'high'
```

### TaskEvent (Discriminated Union)

```typescript
type TaskEvent =
  | { type: 'queued';           data: { taskId: string; position: number } }
  | { type: 'started';          data: { taskId: string } }
  | { type: 'progress';         data: { taskId: string; percent: number; message?: string; detail?: unknown } }
  | { type: 'completed';        data: { taskId: string; result: unknown; durationMs: number } }
  | { type: 'error';            data: { taskId: string; message: string; code: string } }
  | { type: 'cancelled';        data: { taskId: string } }
  | { type: 'stream';           data: { taskId: string; token: string } }
  | { type: 'paused';           data: { taskId: string } }
  | { type: 'resumed';          data: { taskId: string; position: number } }
  | { type: 'priority-changed'; data: { taskId: string; priority: TaskPriority; position: number } }
  | { type: 'queue-position';   data: { taskId: string; position: number } }
```

### TaskInfo

The serializable representation of a task sent over IPC (strips non-serializable fields like `AbortController`).

```typescript
interface TaskInfo {
  taskId: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  startedAt?: number
  completedAt?: number
  windowId?: number
  error?: string
  queuePosition?: number
  durationMs?: number
}
```

### ActiveTask

The full internal task descriptor maintained by `TaskExecutorService`. Contains non-serializable fields.

```typescript
interface ActiveTask {
  taskId: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  startedAt?: number
  completedAt?: number
  controller: AbortController
  timeoutHandle?: NodeJS.Timeout
  windowId?: number
  result?: unknown
  error?: string
  pausedAt?: number
}
```

### TaskQueueStatus

```typescript
interface TaskQueueStatus {
  queued: number      // Tasks waiting (includes paused)
  running: number     // Tasks currently executing
  completed: number   // Tasks in TTL store
}
```

### TrackedTaskState (Renderer)

The renderer-side representation maintained by `TaskStore`.

```typescript
interface TrackedTaskState {
  taskId: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  progress: TaskProgressState
  queuePosition?: number
  durationMs?: number
  error?: string
  result?: unknown
  streamedContent: string
  events: TaskEventRecord[]       // Bounded ring, max 50
}
```

### TaskHandler Interface

```typescript
interface TaskHandler<TInput = unknown, TOutput = unknown> {
  readonly type: string
  validate?(input: TInput): void
  execute(
    input: TInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter
  ): Promise<TOutput>
}
```

### ProgressReporter / StreamReporter

```typescript
interface ProgressReporter {
  progress(percent: number, message?: string, detail?: unknown): void
}

interface StreamReporter {
  stream(token: string): void
}
```

---

## 6. Usage Examples

### Example 1: Simple Task Submission

```tsx
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

function DownloadButton({ url }: { url: string }) {
  const {
    submit,
    status,
    progress,
    progressMessage,
    error,
    result,
    cancel,
  } = useTaskSubmit<{ url: string }, { filePath: string }>(
    'file-download',
    { url },
    { priority: 'normal' }
  )

  return (
    <div>
      <button
        onClick={submit}
        disabled={status === 'running' || status === 'queued'}
      >
        {status === 'idle' && 'Download'}
        {status === 'queued' && 'Queued...'}
        {status === 'running' && `${progress}%`}
        {status === 'completed' && 'Done'}
        {status === 'error' && 'Retry'}
      </button>

      {status === 'running' && (
        <>
          <progress value={progress} max={100} />
          <span>{progressMessage}</span>
          <button onClick={cancel}>Cancel</button>
        </>
      )}

      {status === 'error' && <p className="error">{error}</p>}
      {status === 'completed' && <p>Saved to {result?.filePath}</p>}
    </div>
  )
}
```

### Example 2: Streaming AI Task

```tsx
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

function AIChat({ prompt }: { prompt: string }) {
  const {
    submit,
    status,
    streamedContent,
  } = useTaskSubmit('ai-chat', { prompt })

  return (
    <div>
      <button onClick={submit} disabled={status === 'running'}>
        {status === 'running' ? 'Generating...' : 'Ask AI'}
      </button>

      {streamedContent && (
        <div className="ai-response">
          {streamedContent}
          {status === 'running' && <span className="cursor" />}
        </div>
      )}
    </div>
  )
}
```

For components that only need the stream content and are given a taskId externally:

```tsx
import { useTaskStream } from '@/hooks/useTaskStream'

function StreamViewer({ taskId }: { taskId: string }) {
  const { content, isStreaming, isDone } = useTaskStream(taskId)

  return (
    <pre>
      {content}
      {isStreaming && <BlinkingCursor />}
      {isDone && <span> [Done]</span>}
    </pre>
  )
}
```

### Example 3: Using withTaskTracking HOC

```tsx
import { withTaskTracking, WithTaskTrackingInjectedProps } from '@/components/withTaskTracking'

interface ExportButtonProps extends WithTaskTrackingInjectedProps {
  filePath: string
}

function ExportButton({ filePath, taskTracking }: ExportButtonProps) {
  return (
    <button
      onClick={taskTracking.submit}
      disabled={taskTracking.status === 'running'}
    >
      {taskTracking.status === 'running'
        ? `Exporting... ${taskTracking.progress}%`
        : 'Export PDF'}
    </button>
  )
}

export default withTaskTracking(ExportButton, {
  type: 'file-export',
  input: (props) => ({ path: props.filePath, format: 'pdf' }),
  options: { priority: 'high' },
})
```

### Example 4: Manual Task Control

```tsx
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

function BatchProcessor() {
  const task = useTaskSubmit('batch-process', { items: [1, 2, 3] })

  return (
    <div>
      <button onClick={task.submit}>Start Batch</button>

      {task.status === 'queued' && (
        <div>
          <p>Position in queue: #{task.queuePosition}</p>
          <button onClick={task.pause}>Pause</button>
          <button onClick={() => task.updatePriority('high')}>
            Boost Priority
          </button>
        </div>
      )}

      {task.status === 'paused' && (
        <div>
          <p>Task paused</p>
          <button onClick={task.resume}>Resume</button>
          <button onClick={task.cancel}>Cancel</button>
        </div>
      )}

      {task.status === 'running' && (
        <div>
          <progress value={task.progress} max={100} />
          <button onClick={task.cancel}>Cancel</button>
        </div>
      )}

      {(task.status === 'completed' || task.status === 'error' || task.status === 'cancelled') && (
        <button onClick={task.reset}>Reset</button>
      )}
    </div>
  )
}
```

### Example 5: Queue Monitoring Dashboard

```tsx
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { useTaskList } from '@/hooks/useTaskList'

function QueueDashboard() {
  const { queuedTasks, queueStatus, isLoading, refreshQueueStatus } = useTaskQueue()
  const { tasks: runningTasks } = useTaskList((t) => t.status === 'running')

  if (isLoading) return <p>Loading...</p>

  return (
    <div>
      {queueStatus && (
        <div className="metrics">
          <span>Queued: {queueStatus.queued}</span>
          <span>Running: {queueStatus.running}</span>
          <span>Completed: {queueStatus.completed}</span>
          <button onClick={refreshQueueStatus}>Refresh</button>
        </div>
      )}

      <h3>Queue ({queuedTasks.length})</h3>
      <ul>
        {queuedTasks.map((t) => (
          <li key={t.taskId}>
            #{t.queuePosition} - {t.type} ({t.priority})
            {t.status === 'paused' && ' [PAUSED]'}
          </li>
        ))}
      </ul>

      <h3>Running ({runningTasks.length})</h3>
      <ul>
        {runningTasks.map((t) => (
          <li key={t.taskId}>{t.type}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Example 6: Fetching Results After Navigation

When a component mounts after the task has already completed, use `useTaskResult` to retrieve the persisted result from the main process TTL store:

```tsx
import { useTaskResult } from '@/hooks/useTaskResult'

function ResultViewer({ taskId }: { taskId: string }) {
  const { result, fetchStatus, fetchError, refetch } = useTaskResult<{
    filePath: string
    size: number
  }>(taskId)

  if (fetchStatus === 'loading') return <p>Loading result...</p>
  if (fetchStatus === 'error') return <p>Error: {fetchError}</p>

  if (fetchStatus === 'ready' && result) {
    return (
      <div>
        <p>File: {result.filePath}</p>
        <p>Size: {result.size} bytes</p>
      </div>
    )
  }

  return <p>No result available (may have expired after 5 minutes)</p>
}
```

---

## 7. Internals

### Queuing Algorithm

The queue is maintained as a sorted array in `TaskExecutorService`. The sort key is:

```typescript
// Higher priority weight = earlier in queue; FIFO within same priority
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
}

queue.sort((a, b) => {
  const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
  if (priorityDiff !== 0) return priorityDiff
  return a.queuedAt - b.queuedAt  // Earlier first
})
```

`drainQueue()` iterates from index 0, skipping paused tasks (leaving them in-place), and starts tasks until `maxConcurrency` is reached or the queue is exhausted. Already-aborted tasks are also skipped and removed.

### Result Persistence

```
Active execution                TTL store (Map)               GC
+----------------+    finally   +-------------------+     setInterval
| activeTasks    | -----------> | completedTasks    | -------> evict
| Map<id, task>  |  (move)      | Map<id, {task,    |     (every 60s)
+----------------+              |   expiresAt}>     |
                                +-------------------+

TTL = 5 minutes from task completion/error/cancellation
```

- `getTaskResult(taskId)` first checks `activeTasks`, then `completedTasks` (if TTL has not expired).
- The `controller` field is set to `undefined as unknown as AbortController` in the TTL store since `AbortController` is not serializable and no longer needed.
- GC timer is `unref()`'d so it does not prevent Node.js process exit.

### Event Dispatch

```
Main Process                          Renderer
+---------------------------+         +-----------------------------+
| TaskExecutorService       |         | TaskProvider (single mount) |
|   this.send(windowId,     |  IPC    |   window.task.onEvent(cb)   |
|     'task:event', event)  | ------> |     cb(event)               |
|                           |         |       |                     |
| EventBus                  |         |       v                     |
|   .sendTo(windowId, ...)  |         | TaskStore                   |
|   .broadcast(...)         |         |   .applyEvent(event)        |
+---------------------------+         |       |                     |
                                      |   update(taskId, patch)     |
                                      |       |                     |
                                      |   notifyKey(taskId)  -----> per-task subscribers
                                      |   notifyKey('ALL')   -----> list/queue subscribers
                                      +-----------------------------+
```

**Key design decisions:**

1. **Single IPC listener**: `TaskProvider` mounts exactly one `window.task.onEvent` callback. This avoids O(N) IPC subscriptions when N hooks are active.

2. **Per-taskId routing**: The `TaskStore` uses subscription keys. A key can be a specific `taskId` or the special `'ALL'` key. When a task is updated, both `notifyKey(taskId)` and `notifyKey('ALL')` are called. Hooks like `useTaskProgress` subscribe to a specific taskId, so a stream token for task-A does not cause task-B observers to re-render.

3. **External store**: The `TaskStore` is created outside React (`createTaskStore()`) and accessed via `useSyncExternalStore`. This avoids React state update batching delays for high-frequency events like stream tokens.

4. **Snapshot caching**: The store maintains a `snapshotCache` Map so that `useSyncExternalStore` returns the same object reference when the task has not changed, preventing unnecessary re-renders.

### Window Scoping

```
Renderer                         Main Process
+---------+                      +-----------+
| submit  | -- IPC invoke -----> | TaskIpc   |
| (any    |                      |           |
|  windowId|   event.sender.id   | options.windowId = event.sender.id
|  ignored)|   stamped server-   | (trusted)
+---------+   side               +-----------+
```

This means:
- A malicious renderer cannot submit tasks on behalf of another window.
- Events for window-scoped tasks are only delivered to the originating window.
- When a window closes, all its tasks are automatically cancelled.

### Concurrency Model

- **Max concurrency**: Configurable via constructor (default: 5).
- **Non-blocking**: All task handlers return `Promise`. The Node.js event loop handles concurrency naturally.
- **Per-task AbortController**: Each task gets its own `AbortController`. Cancelling one task does not affect others.
- **Timeout**: Optional per-task timeout creates a `setTimeout` that calls `controller.abort()`. The timeout handle is cleared in the `finally` block.
- **Shutdown**: `destroy()` aborts all active controllers, clears all maps, and stops the GC timer.

---

## 8. Error Handling

### Error Categories

| Error Source | Handling | Event |
|-------------|----------|-------|
| Input validation failure | `handler.validate()` throws; propagated to IPC caller as error result | No task created |
| Unknown task type | `registry.get()` throws; propagated to IPC caller | No task created |
| Handler execution error | Caught in `executeTask`; emits `error` event with message and code | `error` event |
| AbortError (cancellation) | Caught in `executeTask`; emits `cancelled` event | `cancelled` event |
| Timeout | `setTimeout` triggers `controller.abort()`; handler receives AbortError | `cancelled` event |
| IPC failure | Preload returns `IpcResult` with `success: false` | No event; caller checks `.success` |
| Invalid priority | `TaskIpc` throws before reaching executor | IPC error result |

### Error Codes

The `code` field in error events is populated from `Error.name` (e.g., `'Error'`, `'TypeError'`, `'RangeError'`). For cancellation/abort errors, the `cancelled` event type is used instead of `error`.

### IpcResult Envelope

All preload methods return an `IpcResult` envelope. The renderer must always check `result.success` before accessing `result.data`:

```typescript
const result = await window.task.submit('file-download', { url: '...' })
if (!result.success) {
  console.error('Submit failed:', result.error.message)
  return
}
const taskId = result.data.taskId
```

Hooks like `useTaskSubmit` handle this envelope internally and surface errors via the `error` and `status` fields.

---

## 9. Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Task lookup by ID | O(1) | `Map.get()` on `activeTasks` or `completedTasks` |
| Event dispatch to subscribers | O(1) per task | Per-taskId subscription key routes directly |
| Queue sort | O(n log n) | Standard array sort; runs on submit, resume, priority update |
| Queue drain | O(n) | Linear scan skipping paused tasks |
| GC sweep | O(n) | Iterates `completedTasks` Map every 60 seconds |
| Store snapshot rebuild | O(n) | Rebuilds `allTasksSnapshot` array on every mutation |
| Stream token delivery | O(1) | Single store update + per-taskId notification |

**Memory:**
- Active tasks: One `ActiveTask` + one `QueuedTask` per queued task.
- Completed tasks: TTL-evicted after 5 minutes. GC runs every 60 seconds.
- Renderer store: One `TrackedTaskState` per tracked task, with bounded event history (max 50 events per task).
- Snapshot cache: One cached reference per tracked task to prevent `useSyncExternalStore` churn.

---

## 10. Security and Best Practices

### Security

1. **Server-side windowId enforcement**: `TaskIpc` always overrides `options.windowId` with `event.sender.id`. The renderer cannot inject a different windowId.

2. **Priority value allowlist**: `TaskIpc` validates that the priority value is one of `'low'`, `'normal'`, `'high'` before passing it to the executor. Invalid values throw an error.

3. **Input validation**: Handlers can implement `validate(input)` to reject malformed input before the task is queued.

4. **SSRF protection**: `FileDownloadHandler` blocks private network addresses and localhost.

5. **Dangerous file extension warnings**: `FileDownloadHandler` logs warnings for executable file types.

6. **Window close cleanup**: All tasks owned by a closing window are cancelled automatically.

### Best Practices

1. **Place TaskProvider high in the tree**: Wrap your app root or main layout so all task-aware components share a single IPC subscription.

2. **Choose the right hook for the job**:
   - Use `useTaskSubmit` when you need to submit and track a task.
   - Use `useTaskProgress` when you only need to display a progress bar for a known taskId.
   - Use `useTaskStatus` when you only need to conditionally render based on status (minimal re-renders).
   - Use `useTaskStream` when consuming AI streaming output.
   - Use `useTaskResult` when fetching results for tasks that may have completed before mount.

3. **Respect the lifecycle**: Do not call `submit()` while a task is active (the hook guards against this). Call `reset()` after terminal states if you want to resubmit.

4. **Handle all terminal states**: Always handle `completed`, `error`, and `cancelled` in your UI.

5. **Use pause/resume for queue management only**: Running tasks cannot be paused. If you need to stop a running task, cancel it.

6. **Clean up on unmount**: All hooks automatically unsubscribe on unmount. If using `window.task.onEvent` directly, store and call the returned unsubscribe function.

---

## 11. Implementing a Custom Task Handler

To add a new task type, implement the `TaskHandler` interface and register it.

### Step 1: Define Input/Output Types

```typescript
// src/main/tasks/handlers/MyCustomHandler.ts

export interface MyCustomInput {
  documentId: string
  format: 'pdf' | 'docx'
}

export interface MyCustomOutput {
  filePath: string
  pageCount: number
}
```

### Step 2: Implement the Handler

```typescript
import { TaskHandler, ProgressReporter, StreamReporter } from '../TaskHandler'

export class MyCustomHandler implements TaskHandler<MyCustomInput, MyCustomOutput> {
  readonly type = 'my-custom-export'

  validate(input: MyCustomInput): void {
    if (!input.documentId) {
      throw new Error('documentId is required')
    }
    if (!['pdf', 'docx'].includes(input.format)) {
      throw new Error(`Unsupported format: ${input.format}`)
    }
  }

  async execute(
    input: MyCustomInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    _streamReporter?: StreamReporter
  ): Promise<MyCustomOutput> {
    reporter.progress(0, 'Preparing export...')

    // Check for cancellation before expensive operations
    if (signal.aborted) throw new Error('Task cancelled')

    // Simulate work
    reporter.progress(50, 'Converting document...')

    // Pass signal to downstream APIs that support it
    const result = await convertDocument(input.documentId, input.format, signal)

    reporter.progress(100, 'Export complete')

    return {
      filePath: result.path,
      pageCount: result.pages,
    }
  }
}
```

### Step 3: Register the Handler

Register the handler during application bootstrap where the `TaskHandlerRegistry` is configured:

```typescript
import { MyCustomHandler } from './handlers/MyCustomHandler'

registry.register(new MyCustomHandler())
```

### Key Implementation Notes

- **Always respect `AbortSignal`**: Check `signal.aborted` before expensive operations and pass the signal to downstream APIs (fetch, file I/O, etc.).
- **Report progress meaningfully**: Use `reporter.progress(percent, message, detail)` to give users feedback. The `detail` field can carry structured data (speed, ETA, etc.).
- **Use `streamReporter` for streaming content**: AI handlers should emit tokens via `streamReporter.stream(token)` for real-time display.
- **Throw on errors**: Do not catch and swallow errors. The executor handles error events, logging, and cleanup.
- **Validate input early**: The `validate()` method runs before the task is queued. Fail fast with clear error messages.

---

## 12. Testing Recommendations

### Unit Tests

| Area | What to Test |
|------|-------------|
| Task submission | Submit returns a taskId; `queued` event is emitted |
| Queue ordering | High priority tasks execute before normal and low |
| FIFO within priority | Earlier submissions execute first at same priority |
| Cancellation (queued) | Task removed from queue; `cancelled` event emitted |
| Cancellation (running) | AbortSignal fires; handler can clean up |
| Timeout | Task cancelled after `timeoutMs`; `cancelled` event emitted |
| Pause/resume | Paused tasks skipped by `drainQueue`; resumed tasks re-enter queue |
| Priority update | Queue re-sorted; `priority-changed` event with new position |
| Result retrieval | Completed tasks available via `getTaskResult` within TTL |
| TTL expiry | Tasks evicted from `completedTasks` after 5 minutes |
| Max concurrency | No more than `maxConcurrency` tasks run simultaneously |
| Window close | All tasks for that windowId are cancelled |
| Handler validation | Invalid input rejected before queueing |

### Integration Tests

| Scenario | What to Test |
|----------|-------------|
| Pause/resume workflow | Pause queued task, verify skipped, resume, verify re-queued and eventually runs |
| Priority reordering | Submit low + high tasks; verify high runs first |
| Result retrieval after navigation | Submit task, wait for completion, unmount component, remount, fetch via `useTaskResult` |
| Multi-window isolation | Submit tasks from two windows; close one; verify other window's tasks unaffected |
| Event subscription cleanup | Mount/unmount components; verify no leaked IPC listeners |
| Concurrent execution limit | Submit 10 tasks; verify only 5 run at a time |
| Stream token accumulation | Submit AI task; verify `streamedContent` accumulates tokens in order |

### Mocking

For renderer tests, mock `window.task` to avoid IPC:

```typescript
const mockTaskApi = {
  submit: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'test-123' } }),
  cancel: jest.fn().mockResolvedValue({ success: true, data: true }),
  list: jest.fn().mockResolvedValue({ success: true, data: [] }),
  pause: jest.fn().mockResolvedValue({ success: true, data: true }),
  resume: jest.fn().mockResolvedValue({ success: true, data: true }),
  updatePriority: jest.fn().mockResolvedValue({ success: true, data: true }),
  getResult: jest.fn().mockResolvedValue({ success: true, data: null }),
  queueStatus: jest.fn().mockResolvedValue({ success: true, data: { queued: 0, running: 0, completed: 0 } }),
  onEvent: jest.fn().mockReturnValue(() => {}),
}

Object.defineProperty(window, 'task', { value: mockTaskApi })
```

---

## 13. Common Patterns

### TaskProvider Placement

Place `<TaskProvider>` as high as needed -- typically wrapping the main application layout:

```tsx
// App.tsx or AppLayout.tsx
<TaskProvider>
  <Router>
    <Sidebar />
    <MainContent />
  </Router>
</TaskProvider>
```

### Conditional Submission

```tsx
const task = useTaskSubmit('export', { path }, { priority: 'high' })

// Only submit when user clicks, not on mount
const handleExport = async () => {
  const taskId = await task.submit()
  if (taskId) {
    console.log('Task submitted:', taskId)
  }
}
```

### Error Boundary Integration

```tsx
function TaskErrorBoundary({ children }: { children: React.ReactNode }) {
  const task = useTaskSubmit('critical-operation', input)

  if (task.status === 'error') {
    return (
      <div className="error-panel">
        <p>Operation failed: {task.error}</p>
        <button onClick={task.reset}>Try Again</button>
      </div>
    )
  }

  return <>{children}</>
}
```

### Cleanup Pattern for Direct API Usage

When using `window.task.onEvent` directly (outside of hooks), always clean up:

```typescript
useEffect(() => {
  const unsub = window.task.onEvent((event) => {
    // handle event
  })

  return () => unsub()
}, [])
```

### Combining Hooks for Complex UIs

```tsx
function TaskDetail({ taskId }: { taskId: string }) {
  const status = useTaskStatus(taskId)
  const { percent, message } = useTaskProgress(taskId)
  const { content, isStreaming } = useTaskStream(taskId)
  const { events } = useTaskEvents(taskId)

  return (
    <div>
      <StatusBadge status={status} />
      <ProgressBar percent={percent} label={message} />
      {isStreaming && <StreamView content={content} />}
      <EventLog events={events} />
    </div>
  )
}
```

Each hook subscribes to the same taskId key in the store but only re-renders when its specific slice changes. `useTaskStatus` will not re-render on stream tokens, and `useTaskStream` will not re-render on status changes.

---

## File Reference

### Main Process

| File | Description |
|------|-------------|
| `src/main/taskManager/TaskExecutor.ts` | Core executor: queue, concurrency, lifecycle, TTL store |
| `src/main/taskManager/TaskHandlerRegistry.ts` | Type-to-handler registry |
| `src/main/taskManager/TaskHandler.ts` | `TaskHandler`, `ProgressReporter`, `StreamReporter` interfaces |
| `src/main/taskManager/TaskDescriptor.ts` | `ActiveTask`, `TaskOptions`, `TaskStatus` types |
| `src/main/taskManager/TaskEvents.ts` | Re-exports `TaskEvent` from shared types |
| `src/main/taskManager/TaskReactionHandler.ts` | `TaskReactionHandler` interface + typed lifecycle event payloads |
| `src/main/taskManager/TaskReactionRegistry.ts` | Type → `TaskReactionHandler[]` registry (supports wildcard `'*'`) |
| `src/main/taskManager/TaskReactionBus.ts` | `Disposable` observer; subscribes to `AppEvents`, dispatches to handlers |
| `src/main/taskManager/reactions/index.ts` | Barrel: register concrete `TaskReactionHandler` implementations here |
| `src/main/taskManager/index.ts` | Public re-exports for the taskManager module |
| `src/main/ipc/TaskManagerIpc.ts` | IPC channel registration, `windowId` stamping, input validation |
| `src/main/core/EventBus.ts` | `broadcast/sendTo` (renderer IPC) + `emit/on` (`AppEvents` for main process) |
| `src/main/bootstrap.ts` | Wires executor, reaction registry, reaction bus, and all IPC modules |

### Shared

| File | Description |
|------|-------------|
| `src/shared/types.ts` | `TaskEvent`, `TaskInfo`, `TaskStatus`, `TaskPriority`, `TaskQueueStatus`, `TaskSubmitPayload` |
| `src/shared/channels.ts` | `TaskChannels` constant object (IPC channel name strings) |

### Preload

| File | Description |
|------|-------------|
| `src/preload/index.ts` | `window.tasksManager` API implementation |
| `src/preload/index.d.ts` | `TasksManagerApi` type declaration |

### Renderer

| File | Description |
|------|-------------|
| `src/renderer/src/services/taskStore.ts` | Module-level singleton; per-taskId subscriptions; lazy IPC listener |
| `src/renderer/src/services/taskEventBus.ts` | Per-task event pub/sub for streaming content accumulation |
| `src/renderer/src/hooks/useTaskSubmit.ts` | Full lifecycle hook: submit, cancel, pause, resume, stream |
| `src/renderer/src/hooks/useDebugTasks.ts` | All-tasks subscription for the debug page |
| `src/renderer/src/components/withTaskTracking.tsx` | HOC that injects `taskTracking` prop into any component |
| `src/renderer/src/pages/DebugPage.tsx` | Debug page: live task table with controls and event log panel |
