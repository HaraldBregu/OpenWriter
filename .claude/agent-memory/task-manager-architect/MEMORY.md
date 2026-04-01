# Task Manager Architecture - Agent Memory

## System Overview
OpenWriter task manager: Electron main-process TaskExecutor with IPC bridge, preload API, and React hooks.

## Key Files
- Executor: `src/main/task/task-executor.ts`
- Registry: `src/main/task/task-handler-registry.ts`
- Handler interface: `src/main/task/task-handler.ts`
- Descriptors: `src/main/task/task-descriptor.ts`
- Events re-export: `src/main/task/task-events.ts`
- Reaction bus: `src/main/task/task-reaction-bus.ts`
- Reaction registry: `src/main/task/task-reaction-registry.ts`
- IPC: `src/main/ipc/task-manager-ipc.ts`
- Shared types: `src/shared/types.ts` (TaskSubmitPayload, TaskInfo, TaskEvent, etc.)
- Channels: `src/shared/channels.ts` (TaskChannels)
- Preload impl: `src/preload/index.ts` (task submit/cancel/list/onEvent)
- Preload types: `src/preload/index.d.ts` (TaskApi interface)
- useTaskSubmit hook: `src/renderer/src/hooks/use-task-submit.ts`
- useTask hook: `src/renderer/src/hooks/use-task.ts`
- Task event bus: `src/renderer/src/services/task-event-bus.ts`
- Task store: `src/renderer/src/services/task-store.ts` (replaces Redux store for task state)
- Handlers: `src/main/ai/` directory (moved from src/main/tasks/handlers/)
- Agent bootstrap: `src/main/bootstrap.ts` (agent registration + AgentTaskHandler wiring)
- AgentTaskHandler: `src/main/task_manager/handlers/agent-task-handler.ts`
- AI executor: `src/main/ai/core/executor.ts`
- Agent definitions: `src/main/ai/core/definition.ts`

## Agents
- text-completer: single-node (write), custom-state, streamable
- text-enhance: single-node (enhance), custom-state, streamable
- text-writer: single-node (write), custom-state, streamable
- image-generator: two-node (refine-prompt + generate-image), custom-state, only refine-prompt streamable

## Metadata Support (added 2026-03-14)
- `metadata?: Record<string, unknown>` flows through the entire stack

## Patterns
- IPC: registerQuery (read), registerCommand (mutate), registerCommandWithEvent (mutate+sender)
- EventBus: broadcast() for all windows, sendTo() for window-scoped, emit()/on() for main-process events
- Task handlers: Strategy pattern via TaskHandler<TInput, TOutput>
- Preload: typedInvoke (raw), typedInvokeUnwrap (throws on error), typedInvokeRaw (returns IpcResult envelope)
- Security: windowId always overridden from event.sender.id in TaskIpc
- Redux: taskEventReceived auto-creates tasks on 'queued' event if not already tracked
- Custom-state graph: extractGraphOutput is authoritative for final content (fixed 2026-03-16)
- Non-LLM nodes: nodes that make direct API calls (e.g. DALL-E) don't need nodeModels entries; read apiKey from state

## Known Issues
- Preload uses `typedInvokeRaw` for task API (inconsistent with rest of app using `typedInvokeUnwrap`)
- Some old test files reference deleted paths (TaskContext, old handler paths, shared/types/ipc/)
- No task result persistence after completion (deleted from activeTasks in finally block, moved to TTL-based completedTasks)
- `listTasks` uses `undefined as unknown as AbortController` type hack

## Memory Files
- [project_executor_content_fix.md](project_executor_content_fix.md) - extractGraphOutput priority fix details
