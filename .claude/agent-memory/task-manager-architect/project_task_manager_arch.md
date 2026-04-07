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
- `rag-task-handler.ts` — RAG indexing adapter
- `vision-task-handler.ts` — image generation adapter

**IPC layer:** `src/main/ipc/task-manager-ipc.ts` — Electron IPC bridge exposing submit/cancel/list/updatePriority/getResult/queueStatus

**Renderer side:**
- `src/renderer/src/services/task-store.ts` — module-level tracked task state store
- `src/renderer/src/services/task-event-bus.ts` — per-task snapshot subscription system
- `src/renderer/src/hooks/use-task.ts` — task lifecycle hook using taskEventBus
- `src/renderer/src/hooks/use-task-submit.ts` — task lifecycle hook using task-store
- `src/renderer/src/hooks/use-task-listener.ts` — listens for externally-started tasks by type
- `src/renderer/src/hooks/use-debug-tasks.ts` — debug panel hook

**Bootstrap:** `src/main/bootstrap.ts` — registers agent handlers dynamically from AgentRegistry, plus VisionTaskHandler and RagIndexingTaskHandler. maxConcurrency = 10.

**Why:** The two renderer hooks (useTask vs useTaskSubmit) exist because useTask avoids Redux re-render cascades by using taskEventBus directly, while useTaskSubmit uses the centralized task-store.

**How to apply:** When adding new task types, create a handler implementing TaskHandler, register it in bootstrap.ts.
