# Task Manager Architecture - Agent Memory

## System Overview
OpenWriter task manager: Electron main-process TaskExecutor with IPC bridge, preload API, and React hooks.

## Key Files
- Executor: `src/main/task_manager/task-executor.ts`
- Registry: `src/main/task_manager/task-handler-registry.ts`
- Handler interface: `src/main/task_manager/task-handler.ts`
- Descriptors: `src/main/task_manager/task-descriptor.ts`
- Events re-export: `src/main/task_manager/task-events.ts`
- Reaction bus: `src/main/task_manager/task-reaction-bus.ts`
- Reaction registry: `src/main/task_manager/task-reaction-registry.ts`
- IPC: `src/main/ipc/task-manager-ipc.ts`
- Shared types: `src/shared/types.ts` (TaskSubmitPayload, TaskInfo, TaskEvent, etc.)
- Channels: `src/shared/channels.ts` (TaskChannels)
- Preload impl: `src/preload/index.ts` (task submit/cancel/list/onEvent)
- Preload types: `src/preload/index.d.ts` (TaskApi interface)
- useTaskSubmit hook: `src/renderer/src/hooks/use-task-submit.ts`
- useTask hook: `src/renderer/src/hooks/use-task.ts`
- Task event bus: `src/renderer/src/services/task-event-bus.ts`
- Redux store types: `src/renderer/src/store/tasks/types.ts`
- Redux reducer: `src/renderer/src/store/tasks/reducer.ts`
- Redux selectors: `src/renderer/src/store/tasks/selectors.ts`
- Redux actions: `src/renderer/src/store/tasks/actions.ts`
- IPC->Redux bridge: `src/renderer/src/App.tsx` (top-level onEvent listener)
- Handlers: `src/main/ai/` directory (moved from src/main/tasks/handlers/)

## Metadata Support (added 2026-03-14)
- `metadata?: Record<string, unknown>` flows through the entire stack:
  - TaskSubmitPayload, TaskOptions, ActiveTask, QueuedTask, TaskInfo
  - Every TaskEvent variant carries optional metadata
  - Preload API: `submit(type, input, metadata?, options?)`
  - Redux: taskAdded action accepts metadata; TrackedTaskState has metadata field
  - taskEventBus: TaskSnapshot carries metadata; auto-populated from queued events
  - Hooks: TaskOptions includes metadata; passed through to submit and Redux

## Patterns
- IPC: registerQuery (read), registerCommand (mutate), registerCommandWithEvent (mutate+sender)
- EventBus: broadcast() for all windows, sendTo() for window-scoped, emit()/on() for main-process events
- Task handlers: Strategy pattern via TaskHandler<TInput, TOutput>
- Preload: typedInvoke (raw), typedInvokeUnwrap (throws on error), typedInvokeRaw (returns IpcResult envelope)
- Security: windowId always overridden from event.sender.id in TaskIpc
- Redux: taskEventReceived auto-creates tasks on 'queued' event if not already tracked

## Known Issues
- Preload uses `typedInvokeRaw` for task API (inconsistent with rest of app using `typedInvokeUnwrap`)
- Some old test files reference deleted paths (TaskContext, old handler paths, shared/types/ipc/)
- No task result persistence after completion (deleted from activeTasks in finally block, moved to TTL-based completedTasks)
- `listTasks` uses `undefined as unknown as AbortController` type hack
