# Task Subsystem Guide

## Purpose

`src/main/task` is the main-process background task subsystem for OpenWriter.

This folder is responsible for:

- accepting background work requests from IPC
- validating and queueing tasks
- executing tasks concurrently with cancellation and timeout support
- streaming progress and incremental output back to renderer windows
- retaining completed task metadata for short-lived result lookup
- dispatching main-process side effects through task reaction handlers

This folder is the orchestration layer between:

- renderer task submissions
- concrete task handlers
- the AI subsystem in `src/main/ai`
- the main-process `EventBus`

It is not the AI behavior layer itself.
It is also not the renderer state layer.

## Current Structure

```text
src/main/task/
  AGENTS.md
  index.ts
  task-descriptor.ts
  task-events.ts
  task-executor.ts
  task-handler.ts
  task-handler-registry.ts
  task-reaction-handler.ts
  task-reaction-registry.ts
  task-reaction-bus.ts
  handlers/
    agent-task-handler.ts
    indexing-task-handler.ts
  reactions/
    index.ts
    text-enhance-task-reaction.ts
```

## Top-Level Responsibilities

### `task-executor.ts`

This is the core runtime.

`TaskExecutor` is responsible for:

- receiving task submissions
- validating task inputs through the registered handler
- queueing tasks by priority
- executing tasks up to `maxConcurrency`
- creating one `AbortController` per task
- forwarding lifecycle and stream events to the `EventBus`
- supporting explicit cancellation
- supporting timeout-based aborts
- retaining finished tasks for TTL-based result retrieval

This is the heart of the subsystem.

### `task-handler.ts`

This file defines the task handler contract.

Key interfaces:

- `TaskHandler<TInput, TOutput>`
- `ProgressReporter`
- `StreamReporter`

Every concrete handler must expose:

- `type`
- optional `validate(input)`
- `execute(input, signal, reporter, streamReporter?, metadata?)`

This is the execution strategy interface for the subsystem.

### `task-handler-registry.ts`

This registry maps a task `type` string to exactly one task handler.

Responsibilities:

- register handlers
- prevent duplicate handler types
- resolve handlers for execution
- list registered task types

This mirrors the same explicit-registration pattern used elsewhere in the main process.

### `task-descriptor.ts`

This file defines runtime task state.

Important types:

- `TaskOptions`
- `ActiveTask`
- re-exported `TaskPriority`
- re-exported `TaskStatus`

This is where queue-level metadata lives, including:

- task id
- priority
- timeout
- window ownership
- state message
- result
- error
- metadata

### `task-events.ts`

This file re-exports the shared `TaskEvent` type from `src/shared/types`.

The task subsystem emits renderer-facing lifecycle events such as:

- queued
- started
- progress
- stream
- completed
- error
- cancelled
- priority-changed

## Task Data Structure

The task subsystem uses different shapes for the same task at different stages.

Do not treat these as interchangeable.
The public IPC payload, the executor's in-memory record, and the renderer-facing snapshot each serve a different purpose.

### 1. Submission payload

The renderer submits a task through the shared transport contract in `src/shared/types.ts`.

The public payload shape is:

```ts
interface TaskSubmitPayload<TInput = unknown> {
	type: string;
	input: TInput;
	options?: {
		taskId?: string;
		priority?: 'low' | 'normal' | 'high';
		timeoutMs?: number;
		windowId?: number;
	};
	metadata?: Record<string, unknown>;
}
```

Field meaning:

- `type`
  The handler identifier, for example `agent-text-writer` or `index-resources`.

- `input`
  The handler-specific input payload.
  This is intentionally opaque at the queue layer.

- `options.taskId`
  Optional caller-supplied id.
  If omitted, the executor generates a UUID.

- `options.priority`
  Queue priority.
  Higher priority tasks sort ahead of lower priority tasks.

- `options.timeoutMs`
  Optional timeout after which the executor aborts the task.

- `options.windowId`
  Part of the transport shape, but not trusted from the renderer.
  `TaskManagerIpc` overwrites this with the real sender window id on the main side.

- `metadata`
  Arbitrary caller-supplied context that is copied onto the task and echoed in all emitted `TaskEvent`s.

Important rule:

- renderer input is not the final runtime task structure
- `TaskManagerIpc` normalizes the payload before it reaches `TaskExecutor`
- server-side code stamps `windowId` and moves `metadata` into executor options

### 2. Executor submission options

Inside `src/main/task/task-descriptor.ts`, the executor works with `TaskOptions`.

Current shape:

```ts
interface TaskOptions {
	taskId?: string;
	priority?: 'low' | 'normal' | 'high';
	timeoutMs?: number;
	windowId?: number;
	metadata?: Record<string, unknown>;
}
```

This is the internal normalized shape used by `TaskExecutor.submit(...)`.

Compared to the public payload:

- `type` and `input` are already split into separate method parameters
- `metadata` now lives inside `TaskOptions`
- `windowId` is now trusted because it was stamped by `TaskManagerIpc`

### 3. In-memory active task descriptor

The authoritative runtime record is `ActiveTask` in `task-descriptor.ts`.

Current shape:

```ts
interface ActiveTask {
	taskId: string;
	type: string;
	status: 'queued' | 'started' | 'running' | 'completed' | 'error' | 'cancelled';
	priority: 'low' | 'normal' | 'high';
	startedAt?: number;
	stateMessage?: string;
	completedAt?: number;
	controller: AbortController;
	timeoutHandle?: NodeJS.Timeout;
	windowId?: number;
	result?: unknown;
	error?: string;
	metadata?: Record<string, unknown>;
}
```

This is the full executor-side task state.

Field meaning:

- `taskId`
  Stable identifier for lookup, cancellation, event correlation, and result retrieval.

- `type`
  The handler key resolved through `TaskHandlerRegistry`.

- `status`
  Current lifecycle status.
  In practice the executor sets tasks to `queued`, then `running`, then one final terminal state.
  `started` exists in the shared status union but the executor currently uses it as an event type, not as the long-lived in-memory status value.

- `priority`
  The current queue priority.
  This can change while the task is still queued.

- `startedAt` and `completedAt`
  Execution timestamps used for duration and retention logic.

- `stateMessage`
  Human-readable UI message such as `Queued`, `Running`, `Completed`, `Failed`, or a handler-supplied progress message.

- `controller`
  The `AbortController` used for cancellation.
  This is main-process only and never sent over IPC.

- `timeoutHandle`
  The timer used to enforce `timeoutMs`.
  Also main-process only.

- `windowId`
  Ownership marker used to route events back to the originating window and to cancel tasks when that window closes.

- `result`
  Final handler result stored after successful completion.

- `error`
  Final error message stored when the task fails.

- `metadata`
  Opaque correlation data forwarded into every task event.

### 4. Private queued task record

`TaskExecutor` also maintains a private `QueuedTask` shape for tasks waiting on a concurrency slot.

Current fields are:

- `taskId`
- `type`
- `input`
- `priority`
- `windowId`
- `timeoutMs`
- `metadata`
- `controller`
- `queuedAt`

This type is intentionally private to `task-executor.ts`.
It exists because a queued task needs the original `input` and submission-time settings before execution starts, while `ActiveTask` is focused on runtime status and retention.

### 5. IPC-safe task snapshot

The renderer does not receive `ActiveTask` directly.

`TaskManagerIpc` strips non-serializable fields and returns `TaskInfo`:

```ts
interface TaskInfo {
	taskId: string;
	type: string;
	status: 'queued' | 'started' | 'running' | 'completed' | 'error' | 'cancelled';
	priority: 'low' | 'normal' | 'high';
	stateMessage?: string;
	startedAt?: number;
	completedAt?: number;
	windowId?: number;
	error?: string;
	queuePosition?: number;
	durationMs?: number;
	metadata?: Record<string, unknown>;
}
```

This is the transport-safe view used by:

- `task:list`
- `task:get-result`
- renderer task state hydration

Important difference:

- `TaskInfo` has no `controller`
- `TaskInfo` has no `timeoutHandle`
- `TaskInfo` may include presentation-oriented values like `queuePosition` and `durationMs`

### 6. Event stream shape

Incremental task updates are emitted as `TaskEvent`.

Current event union:

- `queued`
  Includes `taskId`, `taskType`, `position`, optional `metadata`, and optional `stateMessage`.

- `started`
  Includes `taskId`, optional `metadata`, and optional `stateMessage`.

- `progress`
  Includes `taskId`, `percent`, optional `message`, optional `detail`, optional `metadata`, and optional `stateMessage`.

- `stream`
  Includes `taskId`, streamed `data`, optional `metadata`, and optional `stateMessage`.

- `completed`
  Includes `taskId`, final `result`, `durationMs`, optional `metadata`, and optional `stateMessage`.

- `error`
  Includes `taskId`, `message`, `code`, optional `metadata`, and optional `stateMessage`.

- `cancelled`
  Includes `taskId`, optional `metadata`, and optional `stateMessage`.

- `priority-changed`
  Includes `taskId`, `priority`, `position`, optional `metadata`, and optional `stateMessage`.

- `queue-position`
  Includes `taskId`, `position`, optional `metadata`, and optional `stateMessage`.

The event stream is the live feed.
`TaskInfo` is a snapshot.
Keep those concepts separate when adding new UI or IPC features.

### `task-reaction-handler.ts`

This defines the interface for main-process side effects that should happen in response to task lifecycle events.

These handlers are observers, not executors.

They can react to:

- submission
- start
- completion
- failure
- cancellation

All callbacks are optional, and handlers subscribe by task type.

### `task-reaction-registry.ts`

This registry holds zero or more reaction handlers per task type.

It supports:

- type-specific reactions
- wildcard `'*'` reactions
- fan-out dispatch to multiple observers

### `task-reaction-bus.ts`

This is the bridge from `EventBus` to `TaskReactionHandler`.

It listens to task lifecycle events on the main-process event bus and invokes the matching reaction handlers.

Important design property:

- errors inside one reaction handler are isolated so they do not break task execution or other handlers

## Concrete Handlers

The concrete executors currently live in `src/main/task/handlers`.

### `handlers/agent-task-handler.ts`

Purpose:

- bridge the generic task queue to the AI agent subsystem in `src/main/ai`

Responsibilities:

- resolve the target `AgentDefinition` from `AgentRegistry`
- validate the prompt input
- resolve provider and model configuration through `ProviderResolver`
- create one model or a per-node model map
- invoke `executeAIAgentsStream(...)`
- translate AI stream events into task stream/progress/result updates

Important detail:

- one `AgentTaskHandler` instance is registered per concrete agent id
- task types therefore look like `agent-<agentId>`

Examples:

- `agent-text-writer`
- `agent-text-completer`
- `agent-text-enhance`
- `agent-image-generator`
- `agent-researcher`

This handler is intentionally the main integration point between the task system and the AI subsystem.

### `handlers/indexing-task-handler.ts`

Purpose:

- execute full resource indexing for the workspace

Responsibilities:

- resolve the active workspace from trusted server-side context
- load documents
- select the correct extractor by file extension
- extract text
- chunk content
- create embeddings
- populate and save the JSON vector store
- write indexing metadata to disk
- report progress across phases

This handler is the batch indexing entrypoint for retrieval preparation.

## Concrete Reactions

The currently committed reaction implementations live in `src/main/task/reactions`.

### `reactions/text-enhance-task-reaction.ts`

Purpose:

- log lifecycle events for `agent-text-enhance`

Responsibilities:

- log submitted
- log started
- log completed
- log failed
- log cancelled

This demonstrates the reaction pattern without mixing logging side effects into the executor or handler code.

## Execution Flow

The high-level flow for a task is:

```text
renderer IPC submit
  -> TaskManagerIpc
  -> TaskExecutor.submit(...)
  -> TaskHandlerRegistry.get(type)
  -> queue by priority
  -> start when concurrency slot is free
  -> handler.execute(...)
  -> progress/stream/completion events
  -> EventBus delivery
  -> renderer listeners and optional task reactions
```

## Task Submission Model

### IPC Entry

Task submissions enter through:

- `src/main/ipc/task-manager-ipc.ts`

That module exposes IPC operations for:

- submit
- cancel
- list
- update priority
- get result
- queue status

Important security behavior:

- `windowId` is stamped server-side from the sender window
- renderer payloads do not get to choose their own trusted window id

### TaskOptions

Each submission can include:

- `taskId`
- `priority`
- `timeoutMs`
- `windowId`
- `metadata`

The most important operational fields are:

- `priority`, which affects queue order
- `timeoutMs`, which causes automatic abort
- `metadata`, which is carried across every emitted event

## Queue Behavior

### Priority Ordering

The executor currently orders tasks by:

1. priority weight
2. FIFO order within the same priority

Priority weights are:

- `high`
- `normal`
- `low`

Higher priority tasks are placed ahead of lower priority tasks before execution.

### Concurrency

`TaskExecutor` runs tasks concurrently up to a configured limit.

Bootstrap currently creates it with:

- max concurrency `10`

When a task finishes, the executor immediately drains the queue and starts the next eligible task.

### Retention

Completed, failed, and cancelled tasks are retained temporarily for result lookup.

Current retention:

- `5 minutes`

This allows:

- post-completion result fetch
- recent task inspection
- queue metrics that include completed items

## Cancellation and Timeout

Each task gets its own `AbortController`.

Cancellation can happen through:

- explicit user/system cancellation
- timeout expiry
- shutdown cleanup
- window-close cleanup through `TaskManagerIpc`

Handlers must respect `AbortSignal`.

This is a hard requirement for long-running or streaming tasks.

## Progress and Streaming

Handlers communicate runtime state through two channels:

### `ProgressReporter`

Use this for:

- percentage complete
- human-readable phase message
- optional structured detail

### `StreamReporter`

Use this for:

- token streaming
- incremental text output
- raw chunk delivery to the renderer

The executor forwards these to renderer windows as `task:event` payloads through the `EventBus`.

## Event Model

The renderer-facing lifecycle events emitted by this subsystem include:

- `queued`
- `started`
- `progress`
- `stream`
- `completed`
- `error`
- `cancelled`
- `priority-changed`

These events include task identifiers and may also include:

- metadata
- stateMessage
- progress details
- duration
- result

The `stateMessage` field is especially important for user-facing task status text.

## Reaction Model

Task reactions are side-effect observers for lifecycle events.

They are useful for:

- logging
- metrics
- audit trails
- task-specific notifications
- future persistence hooks

Use a reaction handler when the work should happen because of task lifecycle, not as part of the task's core business logic.

Examples of appropriate reaction work:

- debug logging
- analytics
- cross-cutting telemetry
- optional notification fan-out

Examples of inappropriate reaction work:

- the primary business logic of the task
- required mutation that the task result depends on

## How This Subsystem Connects To AI

This task layer is the execution and orchestration wrapper around the AI subsystem.

The AI subsystem itself lives in:

- `src/main/ai`

The bridge file is:

- `src/main/task/handlers/agent-task-handler.ts`

That bridge keeps the task system generic while still allowing:

- per-agent execution
- model resolution
- streaming token delivery
- AI-specific progress messaging

This separation is important:

- `src/main/ai` defines AI behavior
- `src/main/task` defines background execution semantics

## Bootstrap Wiring

`src/main/bootstrap.ts` currently does the following task-related setup:

- creates `TaskHandlerRegistry`
- creates `ProviderResolver`
- creates one `AgentTaskHandler` per registered AI agent
- creates `TaskExecutor`
- creates `TaskReactionRegistry`
- registers `TextEnhanceTaskReaction`
- creates and initializes `TaskReactionBus`
- registers `IndexResourcesTaskHandler`

This is the authoritative runtime wiring path.

## Design Boundaries

### Keep the executor generic

`TaskExecutor` should not accumulate task-type-specific business logic.

If behavior depends on task type, it usually belongs in:

- a concrete handler
- a concrete reaction handler

### Keep handlers focused

Each handler should own one coherent unit of work.

Good handler examples:

- invoke one AI agent
- run one indexing pipeline
- perform one structured background operation

Avoid handlers that mix unrelated domains.

### Keep reactions optional and isolated

Reaction handlers must never be required for a task to function correctly.

If a reaction crashes, the task system should still work.
That is already the current design, and it should stay that way.

### Keep window ownership explicit

Tasks may be window-scoped.

The task system already supports:

- routing events to a specific window
- cancelling tasks for a closed window

Do not bypass that logic by inventing alternate window routing paths in handlers.

## Practical Conventions For New Task Handlers

When adding a new task handler:

1. Create a file under `src/main/task/handlers/`.
2. Implement `TaskHandler<TInput, TOutput>`.
3. Keep `validate(...)` cheap and deterministic.
4. Respect `AbortSignal`.
5. Emit meaningful progress messages through `ProgressReporter`.
6. Use `StreamReporter` only when incremental output is useful.
7. Register the handler in `src/main/bootstrap.ts`.
8. Add tests for validation, cancellation, and success/failure flow.

Recommended file pattern:

```text
src/main/task/handlers/my-task-handler.ts
```

Recommended structure inside the file:

- input type
- output type
- handler class
- validation
- execute implementation
- local helpers

## Practical Conventions For New Reactions

When adding a new task reaction:

1. Create a file under `src/main/task/reactions/`.
2. Implement `TaskReactionHandler`.
3. Scope it to one task type unless wildcard behavior is intentional.
4. Keep it side-effect-only.
5. Register it in `src/main/bootstrap.ts`.
6. Export it from `src/main/task/reactions/index.ts` if needed.

Use wildcard reactions only when the side effect truly applies to every task type.

## Current Functional Summary

This subsystem currently provides:

- background execution queue
- priority-aware scheduling
- bounded concurrency
- progress and token streaming
- cancellation and timeouts
- TTL-based result retrieval
- task lifecycle event emission
- main-process reaction dispatch
- AI-agent task execution bridge
- workspace indexing task execution

## Summary

`src/main/task` is the orchestration layer for background work in OpenWriter.

It is where the app decides:

- what gets queued
- when it runs
- how it is cancelled
- how progress is streamed
- how results are retained
- how lifecycle side effects are dispatched

Keep the boundaries sharp:

- business logic in handlers
- generic queue mechanics in the executor
- side effects in reactions
- renderer/API entry in IPC
