# Task Manager Architecture - Agent Memory

## System Overview
OpenWriter task manager: Electron main-process TaskExecutorService with IPC bridge, preload API, and React hooks.

## Key Files
- Executor: `src/main/tasks/TaskExecutorService.ts`
- Registry: `src/main/tasks/TaskHandlerRegistry.ts`
- Handler interface: `src/main/tasks/TaskHandler.ts`
- Descriptors: `src/main/tasks/TaskDescriptor.ts`
- IPC: `src/main/ipc/TaskIpc.ts`
- Shared types: `src/shared/types/ipc/types.ts` (lines 125-159)
- Channels: `src/shared/types/ipc/channels.ts` (lines 139-144)
- Preload: `src/preload/index.ts` (lines 647-664)
- Type decl: `src/preload/index.d.ts` (TaskApi at 261-266)
- useTask hook: `src/renderer/src/hooks/useTask.ts`
- useBlockEnhancement: `src/renderer/src/hooks/useBlockEnhancement.ts`
- Handlers: `src/main/tasks/handlers/` (AIChatHandler, AIEnhanceHandler, FileDownloadHandler)

## Known Issues (as of 2026-02-26)
- Preload uses `typedInvokeRaw` (inconsistent with rest of app using `typedInvokeUnwrap`)
- TaskInfo.status/priority typed as `string` instead of union types
- No task result persistence after completion (deleted from activeTasks in finally block)
- No pause/resume, no priority update post-submission
- Error `code` field in TaskEvent never populated
- useTask creates N subscriptions for N hook instances (O(n) per event)
- listTasks uses `undefined as unknown as AbortController` type hack

## Patterns
- IPC: registerQuery (read), registerCommand (mutate), registerCommandWithEvent (mutate+sender)
- EventBus: broadcast() for all windows, sendTo() for window-scoped, emit()/on() for main-process events
- Task handlers: Strategy pattern via TaskHandler<TInput, TOutput>
- Preload: typedInvoke (raw), typedInvokeUnwrap (throws on error), typedInvokeRaw (returns IpcResult envelope)
- Security: windowId always overridden from event.sender.id in TaskIpc
