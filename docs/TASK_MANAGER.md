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
  - [Main Process API (TaskExecutor)](#main-process-api-taskexecutor)
  - [Preload API (window.tasksManager)](#preload-api-windowtasksmanager)
  - [React Hooks](#react-hooks)
  - [React Components](#react-components)
- [4. Event System](#4-event-system)
  - [Event Types Reference](#event-types-reference)
  - [Event Flow and Timing](#event-flow-and-timing)
- [5. Type System](#5-type-system)
- [6. Usage Examples](#6-usage-examples)
  - [Example 1: Simple Task Submission](#example-1-simple-task-submission)
  - [Example 2: Streaming Task](#example-2-streaming-task)
  - [Example 3: Using withTaskTracking HOC](#example-3-using-withtasktracking-hoc)
  - [Example 4: Direct Preload API](#example-4-direct-preload-api)
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
|  | useTaskSubmit     |  | useDebugTasks  |  | withTaskTracking HOC  |   |
|  |  submit/cancel    |  |  all-tasks view|  |  wraps any component  |   |
|  |  progress/result  |  |  queue stats   |  |  injects taskTracking |   |
|  +--------+----------+  +-------+--------+  +-----------+-----------+   |
|           |                     |                        |               |
|           v                     v                        |               |
|  +--------+--------------------++                        |               |
|  | taskStore (module singleton) |<-----------------------+               |
|  |  - per-taskId subscriptions  |                                        |
|  |  - lazy onEvent listener     |                                        |
|  +--------+---------------------+                                        |
|           |                                                               |
+-----------+--------------------------------------------------------------|
            |
            | task:event (push)   /   ipcRenderer.invoke (request)
            |
+-----------|--------------------------------------------------------------+
|  Preload  |                                                              |
|           v                                                              |
|  +--------+------------------+                                           |
|  | window.tasksManager       |                                           |
|  |  .submit()                |  typedInvokeRaw (IpcResult envelope)      |
|  |  .cancel()                |                                           |
|  |  .updatePriority()        |  typedOn (task:event push channel)        |
|  |  .list()                  |                                           |
|  |  .getResult()             |                                           |
|  |  .queueStatus()           |                                           |
|  |  .onEvent()               |                                           |
|  +---------------------+-----+                                           |
+------------------------|-------------------------------------------------+
                         |
                         | ipcMain.handle / webContents.send
                         |
+------------------------v-------------------------------------------------+
|  Main Process                                                            |
|                                                                          |
|  +---------------------+     +------------------------+                  |
|  | TaskManagerIpc      |---->| TaskExecutor           |                  |
|  |  - registers IPC    |     |  - queue + concurrency |                  |
|  |  - stamps windowId  |     |  - lifecycle mgmt      |                  |
|  |  - validates input  |     |  - TTL result store    |                  |
|  +---------------------+     +----------+-------------+                  |
|                                         |                                |
|                              +----------v-------------+                  |
|                              | TaskHandlerRegistry    |                  |
|                              |  - type -> handler Map |                  |
|                              +----------+-------------+                  |
|                                         |                                |
|                              +----------v-------------------+            |
|                              | TaskHandler (per type)       |            |
|                              |  execute(input, signal, ...) |            |
|                              +------------------------------+            |
|                                                                          |
|  +---------------------+  emit('task:submitted'|'task:started'|...)      |
|  | EventBus            |<-- TaskExecutor emits AppEvents for             |
|  |  .sendTo(windowId)  |    main-process observers (reaction layer)      |
|  |  .broadcast()       |    AND pushes 'task:event' IPC to renderer      |
|  |  .emit() / .on()    |                                                 |
|  +----------+----------+                                                 |
|             |                                                            |
|  +----------v----------+     +------------------------+                  |
|  | TaskReactionBus     |---->| TaskReactionRegistry   |                  |
|  |  - subscribes to    |     |  - type -> handler[]   |                  |
|  |    AppEvents        |     |  - wildcard '*' support|                  |
|  |  - fan-out dispatch |     +----------+-------------+                  |
|  |  - error isolation  |                |                                |
|  +---------------------+     +----------v-------------------+            |
|                              | TaskReactionHandler (per type)|           |
|                              |  onSubmitted / onStarted /   |            |
|                              |  onCompleted / onFailed /    |            |
|                              |  onCancelled                 |            |
|                              +------------------------------+            |
+--------------------------------------------------------------------------+
```

### Key Components

| Component | Layer | File | Responsibility |
|-----------|-------|------|----------------|
| `TaskExecutor` | Main | `src/main/taskManager/TaskExecutor.ts` | Orchestrates queuing, concurrency, lifecycle, TTL result storage |
| `TaskHandlerRegistry` | Main | `src/main/taskManager/TaskHandlerRegistry.ts` | Maps task type strings to `TaskHandler` instances |
| `TaskHandler` | Main | `src/main/taskManager/TaskHandler.ts` | Interface for task execution logic (`execute`, `validate`, `ProgressReporter`, `StreamReporter`) |
| `TaskReactionBus` | Main | `src/main/taskManager/TaskReactionBus.ts` | Subscribes to `AppEvents` from `EventBus`; fan-outs lifecycle events to registered reaction handlers |
| `TaskReactionRegistry` | Main | `src/main/taskManager/TaskReactionRegistry.ts` | Maps task type strings to `TaskReactionHandler[]`; supports wildcard `'*'` |
| `TaskReactionHandler` | Main | `src/main/taskManager/TaskReactionHandler.ts` | Interface for main-process side-effects on task lifecycle events |
| `TaskManagerIpc` | Main | `src/main/ipc/TaskManagerIpc.ts` | IPC bridge: registers channels, stamps `windowId`, validates priority |
| `EventBus` | Main | `src/main/core/EventBus.ts` | Dual-role: `broadcast/sendTo` for renderer IPC; `emit/on` for main-process `AppEvents` |
| `taskStore` | Renderer | `src/renderer/src/services/taskStore.ts` | Module-level singleton; per-taskId subscriptions; lazy IPC listener init via `ensureListening()` |
| `useTaskSubmit` | Renderer | `src/renderer/src/hooks/useTaskSubmit.ts` | Full lifecycle hook: submit, cancel, progress, result |
| `useDebugTasks` | Renderer | `src/renderer/src/hooks/useDebugTasks.ts` | Subscribes to all tracked tasks for the debug page; exposes cancel/hide controls |
| `withTaskTracking` | Renderer | `src/renderer/src/components/withTaskTracking.tsx` | HOC that injects a `taskTracking` prop into any component |
| `DebugPage` | Renderer | `src/renderer/src/pages/DebugPage.tsx` | Live task table with cancel/hide controls and event log panel |

### Data Flow

A task submission follows this path:

```
1. Component calls submit() via useTaskSubmit
2. useTaskSubmit calls window.tasksManager.submit(type, input, options)
3. Preload invokes typedInvokeRaw(TaskChannels.submit, ...)
4. ipcMain.handle routes to TaskManagerIpc
5. TaskManagerIpc stamps windowId from event.sender.id
6. TaskManagerIpc calls TaskExecutor.submit()
7. Executor validates input via handler.validate()
8. Executor creates ActiveTask, enqueues, sorts, emits 'queued' event
9. Executor calls drainQueue() -- if slot available, starts execution
10. Handler.execute() runs with AbortSignal, ProgressReporter, StreamReporter
11. Progress/stream events flow: Executor -> EventBus -> preload onEvent -> taskStore
12. On completion: Executor emits 'completed' event, moves task to TTL store
13. taskStore updates snapshot, notifies per-taskId subscribers
14. useTaskSubmit syncs local state from store snapshot
15. Component re-renders with new status/result
```

---

## 2. Core Concepts

### Task Lifecycle

Every task progresses through a defined state machine:

```
                  +----------+
     submit() --> | queued   |
                  +----+-----+
                       |
                  drainQueue()
                       |
                  +----v-----+
                  | running  |
                  +----+-----+
                       |
            +----------+----------+
            |          |          |
       completed    error    cancel()/timeout
            |          |          |
            v          v          v
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
| `running` | Actively executing in a handler |
| `completed` | Handler returned successfully; result is available |
| `error` | Handler threw a non-abort error |
| `cancelled` | Aborted via `cancel()`, timeout, or window close |

**Constraints:**
- `cancel()` works on both `queued` and `running` tasks.
- Priority can only be updated on `queued` tasks.
- Terminal states (`completed`, `error`, `cancelled`) are final.

### Priority System

Tasks are assigned one of three priority levels:

| Priority | Weight | Description |
|----------|--------|-------------|
| `high` | 3 | Executed before all normal and low tasks |
| `normal` | 2 | Default priority |
| `low` | 1 | Executed only when no higher-priority tasks are queued |

Priority affects queue ordering only. Once a task begins running, its priority has no further effect. Priority can be updated at any time while a task is `queued`, triggering an immediate queue re-sort.

### Queue Management

The queue is a sorted array of `QueuedTask` entries. Ordering is determined by:

1. **Priority** (descending): high > normal > low
2. **FIFO** (ascending `queuedAt` timestamp): within the same priority, earlier submissions run first

The queue is re-sorted on:
- Task submission (`submit`)
- Priority update (`updatePriority`)

`drainQueue()` is called after every state change that might free an execution slot or add work (submit, priority update, task completion). It processes from the front of the sorted queue and starts tasks until `maxConcurrency` (default: 20) running tasks is reached. Already-aborted tasks are skipped and removed.

### Result Persistence

Completed, errored, and cancelled tasks are moved to a TTL-based store for later retrieval:

- **TTL**: 5 minutes (`COMPLETED_TASK_TTL_MS = 300,000 ms`)
- **Garbage collection**: Runs every 60 seconds via `setInterval` (unref'd so it does not prevent process exit)
- **Access**: `getTaskResult(taskId)` checks active tasks first, then the TTL store
- **Purpose**: Allows components that mount after completion (e.g., after navigation) to retrieve results

### Window Scoping

Each task is optionally associated with a `windowId`:

- **Stamping**: `TaskManagerIpc` always overrides `options.windowId` with `event.sender.id` from the IPC event. The renderer cannot spoof this value.
- **Event routing**: When `windowId` is set, events are sent via `EventBus.sendTo(windowId)` to that specific window. When unset, events are broadcast to all windows.
- **Window close cleanup**: `TaskManagerIpc` listens for `window:closed` events and calls `cancelByWindow(windowId)` to abort all tasks owned by the closing window.

---

## 3. Public APIs

### Main Process API (TaskExecutor)

Located at `src/main/taskManager/TaskExecutor.ts`.

```typescript
class TaskExecutor implements Disposable {
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
   * Update the priority of a queued task.
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
   * List all active tasks (queued + running).
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
  windowId?: number         // Set by TaskManagerIpc, not by callers
}
```

### Preload API (window.tasksManager)

Located at `src/preload/index.ts`, typed in `src/preload/index.d.ts`.

All methods return `Promise<IpcResult<T>>` (except `onEvent`) where `IpcResult` is:

```typescript
type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string } }
```

```typescript
interface TasksManagerApi {
  /** Submit a task. Returns { taskId: string } on success. */
  submit(type: string, input: unknown, options?: TaskSubmitOptions): Promise<IpcResult<{ taskId: string }>>

  /** Cancel a running or queued task. Returns boolean. */
  cancel(taskId: string): Promise<IpcResult<boolean>>

  /** List all active tasks. Returns TaskInfo[]. */
  list(): Promise<IpcResult<TaskInfo[]>>

  /** Update priority of a queued task. Returns boolean. */
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

The renderer exposes two task-aware hooks.

#### useTaskSubmit

The primary hook for submitting and tracking a single task. Located at `src/renderer/src/hooks/useTaskSubmit.ts`.

Internally calls `taskStore.ensureListening()` on mount, so no `TaskProvider` or context wrapper is needed.

```typescript
function useTaskSubmit<TInput = unknown, TResult = unknown>(
  type: string,
  input: TInput,
  options?: TaskSubmitOptions
): UseTaskSubmitReturn<TInput, TResult>

interface UseTaskSubmitReturn<TInput, TResult> {
  taskId: string | null
  status: TaskStatus | 'idle'
  progress: number                    // 0–100
  progressMessage: string | undefined
  error: string | null
  result: TResult | null
  queuePosition: number | undefined
  submit: (inputOverride?: TInput) => Promise<string | null>
  cancel: () => Promise<void>
  updatePriority: (priority: TaskPriority) => Promise<void>
  reset: () => void
}
```

#### useDebugTasks

Subscribes to all tasks tracked by the `taskStore` for the debug page. Located at `src/renderer/src/hooks/useDebugTasks.ts`.

```typescript
function useDebugTasks(): UseDebugTasksReturn

interface UseDebugTasksReturn {
  tasks: TrackedTaskState[]       // Visible (non-hidden) tasks
  queueStats: DebugQueueStats
  hide: (taskId: string) => void
  cancel: (taskId: string) => Promise<void>
}

interface DebugQueueStats {
  queued: number
  running: number
  completed: number
  error: number
  cancelled: number
}
```

### React Components

#### withTaskTracking (HOC)

Wraps any component to inject a `taskTracking` prop with full task lifecycle management. Located at `src/renderer/src/components/withTaskTracking.tsx`.

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
    taskId: string | null
  }
}
```

---

## 4. Event System

### Event Types Reference

All events are defined as a discriminated union on the `type` field. Events are pushed from `TaskExecutor` through the `EventBus` on the `task:event` channel.

| Event Type | Data Fields | Emitted When |
|------------|-------------|--------------|
| `queued` | `taskId`, `position` | Task is added to the queue |
| `started` | `taskId` | Task begins execution (leaves queue) |
| `progress` | `taskId`, `percent`, `message?`, `detail?` | Handler calls `reporter.progress()` |
| `stream` | `taskId`, `data` | Handler calls `streamReporter.stream(data)` — raw batch only |
| `completed` | `taskId`, `result`, `durationMs` | Handler returns successfully |
| `error` | `taskId`, `message`, `code` | Handler throws a non-abort error |
| `cancelled` | `taskId` | Task is aborted (cancel, timeout, or window close) |
| `priority-changed` | `taskId`, `priority`, `position` | Priority updated via `updatePriority()` |
| `queue-position` | `taskId`, `position` | Queue position changes |

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
  +---> [stream] events (0..N times, raw data batches)
  |
  v
[completed] event (with result + durationMs)
  OR
[error] event (with message + code)
  OR
[cancelled] event (from cancel()/timeout/window close)
```

**Priority change flow:**

```
[queued] --> updatePriority('high') --> [priority-changed] (priority, position)
```

---

## 5. Type System

All shared types are defined in `src/shared/types.ts`.

### TaskStatus

```typescript
type TaskStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
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
  | { type: 'stream';           data: { taskId: string; data: string } }
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

The full internal task descriptor maintained by `TaskExecutor`. Contains non-serializable fields.

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
}
```

### TaskQueueStatus

```typescript
interface TaskQueueStatus {
  queued: number      // Tasks waiting in queue
  running: number     // Tasks currently executing
  completed: number   // Tasks in TTL store
}
```

### TrackedTaskState (Renderer)

The renderer-side representation maintained by `taskStore`.

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
  /** Emit a raw data batch. Each call delivers one chunk to the renderer. No accumulation. */
  stream(data: string): void
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

### Example 2: Streaming Task

For tasks that emit data chunks in real time, consume `stream` events via `window.tasksManager.onEvent` directly or handle them in the handler's `onCompleted` reaction. The `result` field on the `completed` event carries the final output.

```typescript
// Handler side (main process)
export class DataProcessorHandler implements TaskHandler<Input, string> {
  readonly type = 'data:process'

  async execute(input: Input, signal: AbortSignal, reporter: ProgressReporter, stream?: StreamReporter): Promise<string> {
    let output = ''
    for await (const chunk of processStream(input, signal)) {
      stream?.stream(chunk)       // emit raw batch — no accumulation
      output += chunk
      reporter.progress(/* ... */)
    }
    return output                 // full result available on completion
  }
}
```

```typescript
// Renderer side — subscribe to stream events for a known taskId
useEffect(() => {
  const unsub = window.tasksManager.onEvent((event) => {
    if (event.type === 'stream') {
      const { taskId, data } = event.data as { taskId: string; data: string }
      if (taskId === myTaskId) {
        setOutput((prev) => prev + data)  // accumulate in component
      }
    }
  })
  return unsub
}, [myTaskId])
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

### Example 4: Direct Preload API

For non-React code or one-off operations, call `window.tasksManager` directly:

```typescript
// Submit without a hook
const result = await window.tasksManager.submit('feature:process-file', { filePath }, { priority: 'high' })
if (result.success) {
  const { taskId } = result.data
  // Seed the local taskStore so it appears in the debug page immediately
  taskStore.addTask(taskId, 'feature:process-file')
}

// List all active tasks
const listResult = await window.tasksManager.list()
const tasks = listResult.data // TaskInfo[]

// Queue metrics
const statusResult = await window.tasksManager.queueStatus()
console.log(statusResult.data) // { queued: 2, running: 5, completed: 12 }

// Subscribe to all task events globally
const unsub = window.tasksManager.onEvent((event) => {
  console.log(event.type, event.data)
})
// Later:
unsub()
```

---

## 7. Internals

### Queuing Algorithm

The queue is maintained as a sorted array in `TaskExecutor`. The sort key is:

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

`drainQueue()` processes from the front of the sorted queue, starting tasks until `maxConcurrency` is reached or the queue is exhausted. Already-aborted tasks are skipped and removed without starting.

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
+---------------------------+         +----------------------------------+
| TaskExecutor              |         | taskStore.ensureListening()       |
|   this.send(windowId,     |  IPC    |   window.tasksManager.onEvent(cb)|
|     'task:event', event)  | ------> |     cb(event)                    |
|                           |         |       |                          |
| EventBus                  |         |       v                          |
|   .sendTo(windowId, ...)  |         | taskStore.applyEvent(event)      |
|   .broadcast(...)         |         |       |                          |
+---------------------------+         |   patch(taskId, ...)             |
                                      |       |                          |
                                      |   notifyKey(taskId) --> per-task |
                                      |   notifyKey('ALL')  --> useDebug |
                                      +----------------------------------+
```

**Key design decisions:**

1. **Single IPC listener**: `taskStore.ensureListening()` initializes exactly one `window.tasksManager.onEvent` callback on first call. Subsequent calls are no-ops. This avoids O(N) IPC subscriptions when N hooks are active.

2. **Per-taskId routing**: The `taskStore` uses subscription keys. A key can be a specific `taskId` or the special `'ALL'` key. When a task is updated, both `notifyKey(taskId)` and `notifyKey('ALL')` are called. `useTaskSubmit` subscribes to a specific taskId, so a stream event for task-A does not cause task-B observers to re-render.

3. **Module singleton**: The `taskStore` is a plain module-level singleton (not a React context). No `TaskProvider` wrapper is needed in the component tree.

4. **Snapshot caching**: The store maintains a `snapshotCache` Map so hook callbacks return the same object reference when the task has not changed, preventing unnecessary re-renders.

### Window Scoping

```
Renderer                         Main Process
+---------+                      +-----------+
| submit  | -- IPC invoke -----> | TaskManagerIpc |
| (any    |                      |                |
|  windowId|   event.sender.id   | options.windowId = event.sender.id
|  ignored)|   stamped server-   | (trusted)
+---------+   side               +-----------+
```

This means:
- A malicious renderer cannot submit tasks on behalf of another window.
- Events for window-scoped tasks are only delivered to the originating window.
- When a window closes, all its tasks are automatically cancelled.

### Concurrency Model

- **Max concurrency**: Configurable via constructor (default: 20).
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
| Invalid priority | `TaskManagerIpc` throws before reaching executor | IPC error result |

### Error Codes

The `code` field in error events is populated from `Error.name` (e.g., `'Error'`, `'TypeError'`, `'RangeError'`). For cancellation/abort errors, the `cancelled` event type is used instead of `error`.

### IpcResult Envelope

All preload methods return an `IpcResult` envelope. The renderer must always check `result.success` before accessing `result.data`:

```typescript
const result = await window.tasksManager.submit('file-download', { url: '...' })
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
| Queue sort | O(n log n) | Standard array sort; runs on submit and priority update |
| Queue drain | O(n) | Linear scan from front; aborted tasks skipped |
| GC sweep | O(n) | Iterates `completedTasks` Map every 60 seconds |
| Store snapshot rebuild | O(n) | Rebuilds `allTasksSnapshot` array on every mutation |
| Stream batch delivery | O(1) | Single store update + per-taskId notification |

**Memory:**
- Active tasks: One `ActiveTask` + one `QueuedTask` per queued task.
- Completed tasks: TTL-evicted after 5 minutes. GC runs every 60 seconds.
- Renderer store: One `TrackedTaskState` per tracked task, with bounded event history (max 50 events per task).
- Snapshot cache: One cached reference per tracked task to prevent unnecessary re-renders.

---

## 10. Security and Best Practices

### Security

1. **Server-side windowId enforcement**: `TaskManagerIpc` always overrides `options.windowId` with `event.sender.id`. The renderer cannot inject a different windowId.

2. **Priority value allowlist**: `TaskManagerIpc` validates that the priority value is one of `'low'`, `'normal'`, `'high'` before passing it to the executor. Invalid values throw an error.

3. **Input validation**: Handlers can implement `validate(input)` to reject malformed input before the task is queued.

4. **Window close cleanup**: All tasks owned by a closing window are cancelled automatically.

### Best Practices

1. **No context provider needed**: `useTaskSubmit` calls `taskStore.ensureListening()` internally. No `<TaskProvider>` wrapper is required.

2. **Choose the right API**:
   - Use `useTaskSubmit` when a component needs to submit and track its own task.
   - Use `useDebugTasks` for an all-tasks view (debug page pattern).
   - Use `window.tasksManager` directly for imperative/non-React code; remember to call `taskStore.addTask()` to make it visible in the debug page.

3. **Respect the lifecycle**: Do not call `submit()` while a task is active (the hook guards against this). Call `reset()` after terminal states if you want to resubmit.

4. **Handle all terminal states**: Always handle `completed`, `error`, and `cancelled` in your UI.

5. **Clean up direct subscriptions**: If using `window.tasksManager.onEvent` directly, store and call the returned unsubscribe function in a `useEffect` cleanup.

---

## 11. Implementing a Custom Task Handler

To add a new task type, implement the `TaskHandler` interface and register it.

### Step 1: Define Input/Output Types

```typescript
// src/main/taskManager/handlers/MyCustomHandler.ts

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
import type { TaskHandler, ProgressReporter } from '../TaskHandler'

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
  ): Promise<MyCustomOutput> {
    reporter.progress(0, 'Preparing export...')

    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    reporter.progress(50, 'Converting document...')

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

Register the handler in `bootstrapServices()` inside `src/main/bootstrap.ts`:

```typescript
import { MyCustomHandler } from './taskManager/handlers/MyCustomHandler'

taskHandlerRegistry.register(new MyCustomHandler())
```

### Key Implementation Notes

- **Always respect `AbortSignal`**: Check `signal.aborted` before expensive operations and pass the signal to downstream APIs (fetch, file I/O, etc.).
- **Report progress meaningfully**: Use `reporter.progress(percent, message?, detail?)` to give users feedback. The `detail` field can carry structured data (speed, ETA, etc.).
- **Use `streamReporter` for batched output**: Call `streamReporter.stream(data)` with a raw chunk — no accumulation, no token tracking. Each call emits one `stream` event to the renderer.
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
| Priority update | Queue re-sorted; `priority-changed` event with new position |
| Result retrieval | Completed tasks available via `getTaskResult` within TTL |
| TTL expiry | Tasks evicted from `completedTasks` after 5 minutes |
| Max concurrency | No more than `maxConcurrency` tasks run simultaneously |
| Window close | All tasks for that windowId are cancelled |
| Handler validation | Invalid input rejected before queueing |

### Integration Tests

| Scenario | What to Test |
|----------|-------------|
| Priority reordering | Submit low + high tasks; verify high runs first |
| Result retrieval after navigation | Submit task, wait for completion, unmount, remount, verify result available |
| Multi-window isolation | Submit tasks from two windows; close one; verify other window's tasks unaffected |
| Event subscription cleanup | Mount/unmount components; verify no leaked IPC listeners |
| Concurrent execution limit | Submit 30 tasks; verify only 20 run at a time |
| Stream batch delivery | Submit streaming task; verify each `stream` event carries a raw batch |

### Mocking

For renderer tests, mock `window.tasksManager` to avoid IPC:

```typescript
const mockTasksManager = {
  submit: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'test-123' } }),
  cancel: jest.fn().mockResolvedValue({ success: true, data: true }),
  list: jest.fn().mockResolvedValue({ success: true, data: [] }),
  updatePriority: jest.fn().mockResolvedValue({ success: true, data: true }),
  getResult: jest.fn().mockResolvedValue({ success: true, data: null }),
  queueStatus: jest.fn().mockResolvedValue({ success: true, data: { queued: 0, running: 0, completed: 0 } }),
  onEvent: jest.fn().mockReturnValue(() => {}),
}

Object.defineProperty(window, 'tasksManager', { value: mockTasksManager })
```

---

## 13. Common Patterns

### Conditional Submission

```tsx
const task = useTaskSubmit('export', { path }, { priority: 'high' })

const handleExport = async () => {
  const taskId = await task.submit()
  if (taskId) {
    console.log('Task submitted:', taskId)
  }
}
```

### Error Display

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

When using `window.tasksManager.onEvent` directly (outside of hooks), always clean up:

```typescript
useEffect(() => {
  const unsub = window.tasksManager.onEvent((event) => {
    // handle event
  })
  return () => unsub()
}, [])
```

### Seeding the Debug Page from Imperative Code

```typescript
const result = await window.tasksManager.submit('my-task', input)
if (result.success) {
  // Seed taskStore so the task appears in the debug page immediately.
  // If the 'queued' IPC event arrives first, addTask is a no-op.
  taskStore.addTask(result.data.taskId, 'my-task')
}
```

---

## 14. Using TaskManager from the Main Process (Node.js)

The main process owns the entire task execution infrastructure. There are two distinct roles: **submitting tasks** (via `TaskExecutor`) and **reacting to tasks** (via `TaskReactionBus`).

### 14.1 Implementing a Task Handler

A `TaskHandler` performs the actual background work. It runs in the main process Node.js environment with full access to the file system, native APIs, and services.

```typescript
// src/main/taskManager/handlers/MyFeatureHandler.ts
import type { TaskHandler, ProgressReporter, StreamReporter } from '../TaskHandler'

export interface MyFeatureInput {
  filePath: string
  options?: { compress: boolean }
}

export class MyFeatureHandler implements TaskHandler<MyFeatureInput, string> {
  readonly type = 'feature:process-file'

  validate(input: MyFeatureInput): void {
    if (!input?.filePath) throw new Error('filePath is required')
  }

  async execute(
    input: MyFeatureInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    stream?: StreamReporter,
  ): Promise<string> {
    reporter.progress(10, 'Reading file…')
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    // Emit raw output batches as they arrive
    for await (const chunk of readChunks(input.filePath, signal)) {
      stream?.stream(chunk)  // raw batch — renderer accumulates if needed
      reporter.progress(/* ... */)
    }

    reporter.progress(100, 'Done')
    return 'output-path'
  }
}
```

**Key rules:**
- Check `signal.aborted` before each async step so cancel/timeout works cleanly.
- Call `reporter.progress(0–100, message?)` to emit `progress` events to the renderer.
- Call `streamReporter.stream(data)` for real-time chunk delivery. Each call is one batch — no accumulation on the main process side.
- Throw `new DOMException('Aborted', 'AbortError')` (or let AbortSignal propagate) to signal cancellation.

### 14.2 Registering a Task Handler

Register handlers in `bootstrapServices()` inside `src/main/bootstrap.ts`:

```typescript
import { MyFeatureHandler } from './taskManager/handlers/MyFeatureHandler'

const taskHandlerRegistry = container.register('taskHandlerRegistry', new TaskHandlerRegistry())
taskHandlerRegistry.register(new MyFeatureHandler())
container.register('taskExecutor', new TaskExecutor(taskHandlerRegistry, eventBus, 20))
```

### 14.3 Submitting a Task from the Main Process

The main process can submit tasks directly via `TaskExecutor` without going through IPC:

```typescript
const executor = container.get<TaskExecutor>('taskExecutor')

const taskId = executor.submit('feature:process-file', { filePath: '/path/to/file' }, {
  priority: 'high',
  timeoutMs: 30_000,
  // windowId: omit to broadcast events to all windows
})
```

Events (`queued`, `started`, `progress`, `completed`, …) are automatically broadcast to all renderer windows via `EventBus.broadcast()`, or sent to a specific window when `windowId` is provided.

### 14.4 Implementing a Task Reaction Handler

A `TaskReactionHandler` runs **side-effects** in the main process when a task reaches a lifecycle milestone. It does not execute the task — it observes it.

```typescript
// src/main/taskManager/reactions/MyFeatureTaskReaction.ts
import type {
  TaskReactionHandler,
  TaskSubmittedEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
} from '../TaskReactionHandler'

export class MyFeatureTaskReaction implements TaskReactionHandler {
  readonly taskType = 'feature:process-file'

  onSubmitted(event: TaskSubmittedEvent): void {
    console.log(`[MyFeature] Task queued: ${event.taskId}`)
  }

  async onCompleted(event: TaskCompletedEvent): Promise<void> {
    await notifyUser(event.result as string)
    console.log(`[MyFeature] Processed in ${event.durationMs}ms`)
  }

  onFailed(event: TaskFailedEvent): void {
    console.error(`[MyFeature] Failed: ${event.error}`)
  }
}
```

Use `taskType = '*'` to receive lifecycle events for **every** task type (useful for logging or analytics):

```typescript
export class TaskAuditReaction implements TaskReactionHandler {
  readonly taskType = '*'

  onCompleted(event: TaskCompletedEvent): void {
    auditLog.record({ taskId: event.taskId, type: event.taskType, ms: event.durationMs })
  }
}
```

### 14.5 Registering a Reaction Handler

Add the handler to the `TaskReactionRegistry` in `bootstrap.ts`:

```typescript
import { MyFeatureTaskReaction } from './taskManager/reactions/MyFeatureTaskReaction'

const taskReactionRegistry = new TaskReactionRegistry()
taskReactionRegistry.register(new MyFeatureTaskReaction())
const taskReactionBus = container.register(
  'taskReactionBus',
  new TaskReactionBus(taskReactionRegistry, eventBus),
)
taskReactionBus.initialize()
```

Also export the concrete reaction from `src/main/taskManager/reactions/index.ts`:

```typescript
export { MyFeatureTaskReaction } from './MyFeatureTaskReaction'
```

### 14.6 Lifecycle Event Payloads

| AppEvent key | Payload fields | When fired |
|---|---|---|
| `task:submitted` | `taskId, taskType, input, priority, windowId?` | After validation, before queuing |
| `task:started` | `taskId, taskType, windowId?` | When execution slot is acquired |
| `task:completed` | `taskId, taskType, result, durationMs, windowId?` | On successful completion |
| `task:failed` | `taskId, taskType, error, code, windowId?` | On unhandled non-abort error |
| `task:cancelled` | `taskId, taskType, windowId?` | On `cancel()` call or timeout abort |

These are emitted via `EventBus.emit()` (main-process `AppEvents`) **in addition to** the IPC `task:event` channel pushed to the renderer.

---

## 15. Using TaskManager from the Renderer

The renderer never touches `TaskExecutor` directly. All task operations go through the preload bridge (`window.tasksManager`) and are tracked by the `taskStore` singleton.

### 15.1 Submitting a Task

Use the `useTaskSubmit` hook for any component that needs to submit and track a single task:

```typescript
import { useTaskSubmit } from '../hooks/useTaskSubmit'

function ProcessFileButton({ filePath }: { filePath: string }) {
  const task = useTaskSubmit('feature:process-file', { filePath }, { priority: 'normal' })

  return (
    <div>
      <button onClick={() => task.submit()} disabled={task.status === 'running'}>
        Process
      </button>

      {task.status === 'running' && (
        <>
          <progress value={task.progress} max={100} />
          <span>{task.progressMessage}</span>
          <button onClick={() => task.cancel()}>Cancel</button>
        </>
      )}

      {task.status === 'completed' && <p>Done: {String(task.result)}</p>}
      {task.status === 'error' && <p>Error: {task.error}</p>}
    </div>
  )
}
```

#### `useTaskSubmit` return shape

| Field | Type | Description |
|---|---|---|
| `taskId` | `string \| null` | ID of the current task (null before first submit) |
| `status` | `TaskStatus \| 'idle'` | Current lifecycle state |
| `progress` | `number` | 0–100 progress percent |
| `progressMessage` | `string?` | Human-readable progress label |
| `error` | `string \| null` | Error message on failure |
| `result` | `TResult \| null` | Task result on completion |
| `queuePosition` | `number?` | Position in queue while queued |
| `submit(input?)` | `() => Promise<string \| null>` | Submit (or re-submit) the task |
| `cancel()` | `() => Promise<void>` | Cancel the running/queued task |
| `updatePriority(p)` | `() => Promise<void>` | Change queue priority |
| `reset()` | `() => void` | Reset to idle state |

### 15.2 Consuming Stream Events

For tasks that emit data in batches, subscribe to `stream` events via `window.tasksManager.onEvent`. The renderer is responsible for accumulating chunks:

```typescript
function StreamingOutput({ taskId }: { taskId: string }) {
  const [output, setOutput] = useState('')

  useEffect(() => {
    const unsub = window.tasksManager.onEvent((event) => {
      if (event.type !== 'stream') return
      const { taskId: id, data } = event.data as { taskId: string; data: string }
      if (id === taskId) setOutput((prev) => prev + data)
    })
    return unsub
  }, [taskId])

  return <pre>{output}</pre>
}
```

### 15.3 Direct Preload API

For non-React code or one-off operations, call `window.tasksManager` directly:

```typescript
const result = await window.tasksManager.submit('feature:process-file', { filePath }, { priority: 'high' })
if (result.success) {
  const { taskId } = result.data
  taskStore.addTask(taskId, 'feature:process-file')
}
```

---

## 16. Task Reaction Layer

The reaction layer runs **main-process side-effects** triggered by task lifecycle events without coupling to the executor. It uses the Observer + Registry pattern.

### Architecture

```
TaskExecutor
  └─ eventBus.emit('task:submitted' | 'task:started' | 'task:completed' | 'task:failed' | 'task:cancelled')
        |
        v
  TaskReactionBus  (initialized via taskReactionBus.initialize())
        |
        v
  TaskReactionRegistry.getForType(taskType)
        |
        +──> handler[].onSubmitted / onStarted / onCompleted / onFailed / onCancelled
             (each handler is isolated; errors are caught per-handler)
```

### TaskReactionHandler Interface

```typescript
interface TaskReactionHandler {
  readonly taskType: string  // specific type string or '*' for wildcard

  onSubmitted?(event: TaskSubmittedEvent): void | Promise<void>
  onStarted?(event: TaskStartedEvent): void | Promise<void>
  onCompleted?(event: TaskCompletedEvent): void | Promise<void>
  onFailed?(event: TaskFailedEvent): void | Promise<void>
  onCancelled?(event: TaskCancelledEvent): void | Promise<void>
}
```

All lifecycle methods are optional. Implement only the ones you need.

### Event Payload Types

```typescript
interface TaskSubmittedEvent {
  taskId: string; taskType: string; input: unknown; priority: string; windowId?: number
}
interface TaskStartedEvent {
  taskId: string; taskType: string; windowId?: number
}
interface TaskCompletedEvent {
  taskId: string; taskType: string; result: unknown; durationMs: number; windowId?: number
}
interface TaskFailedEvent {
  taskId: string; taskType: string; error: string; code: string; windowId?: number
}
interface TaskCancelledEvent {
  taskId: string; taskType: string; windowId?: number
}
```

### Error Isolation

Each handler's callback is wrapped in a `try/catch`. A throwing handler does not prevent other handlers from receiving the same event.

### DemoTaskHandler

A built-in handler (`src/main/taskManager/handlers/DemoTaskHandler.ts`) exercises all parts of the task lifecycle for use in the debug page:

| Variant | Description |
|---------|-------------|
| `fast` | 4 progress steps, ~1.2 s |
| `slow` | 10 progress steps, ~8 s |
| `streaming` | 21 raw data batches at 140 ms each, ~3 s |
| `error` | Progresses to 60 % then throws a simulated failure |

All variants respect `AbortSignal` so cancel works mid-run.

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
| `src/main/taskManager/handlers/DemoTaskHandler.ts` | Built-in demo handler with 4 variants (fast/slow/streaming/error) |
| `src/main/taskManager/reactions/index.ts` | Barrel: register concrete `TaskReactionHandler` implementations here |
| `src/main/taskManager/reactions/DemoTaskReaction.ts` | Reaction handler for the demo task type |
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
| `src/renderer/src/hooks/useTaskSubmit.ts` | Full lifecycle hook: submit, cancel, progress, result |
| `src/renderer/src/hooks/useDebugTasks.ts` | All-tasks subscription for the debug page |
| `src/renderer/src/components/withTaskTracking.tsx` | HOC that injects `taskTracking` prop into any component |
| `src/renderer/src/pages/DebugPage.tsx` | Debug page: live task table with cancel/hide controls and event log panel |
