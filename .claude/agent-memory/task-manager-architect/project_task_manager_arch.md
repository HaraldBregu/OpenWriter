---
name: TaskManager Architecture Overview
description: Architecture of the OpenWriter TaskManager system — core files, patterns, handler registration, and renderer integration
type: project
---

The TaskManager is a priority-queue-based concurrent task execution system bridging Electron main and renderer processes.

**Core files (src/main/task/):**
- `task-executor.ts` — orchestrator: submit, cancel, drain queue, lifecycle events, TTL-based result retention
- `task-handler-registry.ts` — Strategy registry: Map<string, TaskHandler>
- `task-handler.ts` — Handler interface with validate/execute, ProgressReporter, StreamReporter
- `task-descriptor.ts` — ActiveTask, TaskOptions, re-exports shared TaskState/TaskPriority
- `task-execution-context.ts` — AsyncLocalStorage for per-task context propagation
- `task-reaction-bus.ts` + `task-reaction-registry.ts` + `task-reaction-handler.ts` — Observer layer for main-process side-effects on task lifecycle events
- `task-events.ts` — re-exports TaskEvent from shared/types

**Handlers (src/main/task/handlers/):**
- `agent-task-handler.ts` — bridges TaskManager to AI Agents subsystem, one instance per agent definition
- `rag-task-handler.ts` — RAG indexing adapter; receives server-stamped windowId, Embedder resolves its own config
- `ocr-task-handler.ts` — receives windowId, resolves API key via ServiceResolver server-side in constructor
- `nb-task-handler.ts` — knowledge base builder; self-contained, receives apiKey directly in input (NbTaskInput)

**IPC layer:** `src/main/ipc/task-manager-ipc.ts` — Electron IPC bridge exposing submit/cancel/list/updatePriority/getResult/queueStatus. Stamps `windowId` and `workspacePath` into both metadata and input objects server-side.

**Renderer side:**
- `src/renderer/src/services/task-store.ts` — module-level tracked task state store
- `src/renderer/src/services/task-event-bus.ts` — per-task snapshot subscription system
- `src/renderer/src/hooks/use-task.ts` — task lifecycle hook using taskEventBus (NO progress percent)
- `src/renderer/src/hooks/use-task-submit.ts` — task lifecycle hook using task-store (HAS progress percent/message)
- `src/renderer/src/hooks/use-task-listener.ts` — listens for externally-started tasks by type (no submit, no progress)
- `src/renderer/src/hooks/use-debug-tasks.ts` — debug panel hook

**Bootstrap:** `src/main/bootstrap.ts` — registers agent handlers dynamically from AgentRegistry, plus RagIndexingTaskHandler and OcrTaskHandler. maxConcurrency = 10.

**Data page:** `src/renderer/src/pages/resources/data/Provider.tsx` uses `useTaskListener('index-resources')` for RAG indexing. Submits via raw `window.task.submit()`.

**Service access:** `window.app.getServices()` returns `(Service & { id: string })[]` on renderer side. Server-side: `ServiceResolver.resolve()` in `src/main/shared/service-resolver.ts`.

**Why two renderer hooks:** useTask avoids Redux re-render cascades by using taskEventBus directly, while useTaskSubmit uses the centralized task-store with full progress tracking.

**How to apply:** When adding new task types, create a handler implementing TaskHandler, register in bootstrap.ts, choose renderer hook based on whether you need progress percent.
