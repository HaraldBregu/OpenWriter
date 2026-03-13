# TaskManager ↔ AI Agents: Handler Integration

How the TaskManager communicates with the AI agent subsystem through `AgentTaskHandler` — the single bridge between two fully decoupled subsystems.

---

## Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
  - [Subsystem Boundary](#subsystem-boundary)
  - [Layer Diagram](#layer-diagram)
  - [End-to-End Data Flow](#end-to-end-data-flow)
- [2. The Bridge: AgentTaskHandler](#2-the-bridge-agenttaskhandler)
  - [Responsibilities](#responsibilities)
  - [Input / Output Contracts](#input--output-contracts)
  - [Model Resolution Priority](#model-resolution-priority)
  - [Streaming Mechanics](#streaming-mechanics)
- [3. AI Agent Definition System](#3-ai-agent-definition-system)
  - [AgentDefinition Interface](#agentdefinition-interface)
  - [GraphInputContext](#graphinputcontext)
  - [Execution Protocols](#execution-protocols)
- [4. AI Executor](#4-ai-executor)
  - [Three Execution Paths](#three-execution-paths)
  - [Custom-State Protocol (WriterState)](#custom-state-protocol-writerstate)
  - [Token Streaming](#token-streaming)
- [5. Writing Assistant: Concrete Example](#5-writing-assistant-concrete-example)
  - [Agent Definition](#agent-definition)
  - [WriterState](#writerstate)
  - [Graph Topology](#graph-topology)
  - [Node Implementation](#node-implementation)
- [6. Metadata Flow](#6-metadata-flow)
  - [End-to-End Path](#end-to-end-path)
  - [Usage in WriterState](#usage-in-writerstate)
- [7. Registration & Bootstrap](#7-registration--bootstrap)
  - [Wiring Order](#wiring-order)
  - [Adding a New Agent](#adding-a-new-agent)
- [8. Supporting Infrastructure](#8-supporting-infrastructure)
  - [AgentRegistry](#agentregistry)
  - [ModelRegistry](#modelregistry)
  - [ProviderResolver](#providerresolver)
- [9. File Reference](#9-file-reference)

---

## 1. Architecture Overview

### Subsystem Boundary

The TaskManager and AI Agents are **fully decoupled** subsystems. Neither imports from the other. The only file that imports from both is `AgentTaskHandler`, which acts as a one-way bridge:

```
TaskManager subsystem                AI Agents subsystem
(task-executor, task-handler, ...)   (executor, definition, agents, ...)
         │                                    │
         └──────── AgentTaskHandler ──────────┘
                   (sole bridge)
```

This boundary is enforced by convention: no task manager type appears in the AI module, and no AI type appears in the task manager module.

### Layer Diagram

```
+------------------------------------------------------------------------+
|  Renderer Process                                                      |
|                                                                        |
|  +-----------------+   +----------------+                              |
|  | useTask hook    |   | useTaskSubmit  |                              |
|  | (local state +  |   | (Redux-backed) |                              |
|  |  event bus)     |   |                |                              |
|  +--------+--------+   +-------+--------+                              |
|           |                     |                                      |
|           v                     v                                      |
|  +--------+---------------------+--------+                             |
|  | task-event-bus (module singleton)     |                             |
|  |  - per-task snapshots (with metadata) |                             |
|  |  - lazy window.task.onEvent listener  |                             |
|  +--------+------------------------------+                             |
|           |                                                            |
+-----------|------------------------------------------------------------+
            | window.task.submit(type, input, { metadata })
            |
+-----------|------------------------------------------------------------+
|  Preload  |                                                            |
|           v                                                            |
|  +--------+------------------+                                         |
|  | window.task.submit()      |  typedInvokeRaw → ipcMain.handle       |
|  +---------------------------+                                         |
+-----------|------------------------------------------------------------+
            |
+-----------|------------------------------------------------------------+
|  Main Process                                                          |
|           v                                                            |
|  +--------+------------------+                                         |
|  | TaskManagerIpc            |  Stamps windowId, injects metadata      |
|  +--------+------------------+  into input object                      |
|           |                                                            |
|           v                                                            |
|  +--------+------------------+                                         |
|  | TaskExecutor              |  Queue + concurrency management         |
|  +--------+------------------+                                         |
|           |                                                            |
|           v                                                            |
|  +--------+------------------+        +------------------------+       |
|  | TaskHandlerRegistry      | -----> | AgentTaskHandler        |       |
|  |   type → handler map     |        | (bridge to AI agents)   |       |
|  +---------------------------+        +--------+---------------+       |
|                                                |                       |
|  - - - - - - - - - - - - - - - - - -  subsystem boundary  - - - - - - |
|                                                |                       |
|                                       +--------v---------------+       |
|                                       | executeAIAgentsStream  |       |
|                                       | (async generator)      |       |
|                                       +--------+---------------+       |
|                                                |                       |
|                                       +--------v---------------+       |
|                                       | buildGraphInput(ctx)   |       |
|                                       | Graph execution        |       |
|                                       | extractGraphOutput()   |       |
|                                       +------------------------+       |
+------------------------------------------------------------------------+
```

### End-to-End Data Flow

```
1.  Component calls task.submit({ prompt }, { metadata: { positionFrom } })
2.  useTask hook calls window.task.submit('agent-writing-assistant', input, options)
3.  Preload serializes and sends via IPC to main process
4.  TaskManagerIpc stamps windowId, injects options.metadata into input
5.  TaskExecutor.submit() validates via handler.validate(), enqueues task
6.  TaskExecutor.drainQueue() picks task, calls handler.execute(input, signal, ...)
7.  AgentTaskHandler resolves agent definition + model config
8.  AgentTaskHandler calls executeAIAgentsStream({ ..., metadata: input.metadata })
9.  Executor builds GraphInputContext with metadata, calls buildGraphInput(ctx)
10. Graph runs: START → continue_writing → END
11. Token events stream back: executor → AgentTaskHandler → StreamReporter → EventBus → renderer
12. Final result returned as AgentTaskOutput { content, tokenCount, agentId }
13. TaskExecutor emits 'completed' event with result
14. Renderer receives event via task-event-bus, updates snapshot
```

---

## 2. The Bridge: AgentTaskHandler

**File:** `src/main/task_manager/handlers/agent-task-handler.ts`

### Responsibilities

1. **Resolve agent definition** from `AgentRegistry` by agent ID
2. **Resolve model configuration** using a 3-tier priority cascade
3. **Execute the AI stream** via `executeAIAgentsStream()` generator
4. **Forward streaming tokens** to the renderer via `StreamReporter`
5. **Report progress** incrementally (every 20 tokens)
6. **Return structured output** as `AgentTaskOutput`

### Input / Output Contracts

```typescript
// What the handler receives from the task submission
interface AgentTaskInput {
	prompt: string; // User-facing text / raw input
	providerId?: string; // Override: provider ID
	modelId?: string; // Override: model ID
	temperature?: number; // Override: sampling temperature
	maxTokens?: number; // Override: max token limit
	metadata?: Record<string, unknown>; // Opaque caller-supplied metadata
}

// What the handler returns on completion
interface AgentTaskOutput {
	content: string; // Full generated text
	tokenCount: number; // Total tokens produced
	agentId: string; // Which agent handled the task
}
```

The handler type string follows the pattern `agent-{agentId}`. For example, an agent with ID `writing-assistant` is registered as handler type `agent-writing-assistant`.

### Model Resolution Priority

The handler resolves provider, model, and temperature using a 3-tier cascade:

```
Priority 1 (highest): Task input overrides
    input.providerId, input.modelId, input.temperature

Priority 2: ModelRegistry role config
    If agent.role is set AND ModelRegistry has config for that role

Priority 3 (lowest): ProviderResolver defaults
    User's global settings from StoreService
```

```typescript
// Resolution logic inside AgentTaskHandler.execute()
const roleConfig =
	def.role && modelRegistry?.has(def.role) ? modelRegistry.resolve(def.role) : undefined;

const providerId = input.providerId ?? roleConfig?.providerId;
const modelId = input.modelId ?? roleConfig?.modelId;
const temperature = input.temperature ?? roleConfig?.temperature ?? 0.7;
const maxTokens = input.maxTokens ?? roleConfig?.maxTokens;

const provider = providerResolver.resolve({ providerId, modelId });
```

### Streaming Mechanics

The handler consumes the async generator from `executeAIAgentsStream()` and dispatches events:

| Generator Event | Handler Action                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `token`         | Forwards to `streamReporter.stream(token)`, increments counter, reports progress every 20 tokens |
| `done`          | Captures final `content` and `tokenCount`                                                        |
| `error (abort)` | Throws `DOMException('Aborted', 'AbortError')`                                                   |
| `error (other)` | Throws `Error(event.error)`                                                                      |
| `thinking`      | Ignored (informational)                                                                          |

Progress reporting advances from 10% to 90% during streaming (2% every 20 tokens), then jumps to 100% on completion.

---

## 3. AI Agent Definition System

### AgentDefinition Interface

**File:** `src/main/ai/core/definition.ts`

Every agent is described by an `AgentDefinition`:

```typescript
interface AgentDefinition {
	id: string; // Machine-readable ID (e.g. 'writing-assistant')
	name: string; // Display name
	category: 'writing' | 'editing' | 'analysis' | 'utility';
	role?: ModelRole; // For ModelRegistry lookups

	// LangGraph factory (optional — enables graph execution)
	buildGraph?: (model: BaseChatModel) => CompiledStateGraph;

	// Custom-state protocol hooks (required as a pair)
	buildGraphInput?: (ctx: GraphInputContext) => Record<string, unknown>;
	extractGraphOutput?: (state: Record<string, unknown>) => string;
}
```

### GraphInputContext

The bridge between the executor and agent definitions. Contains all executor-resolved context that `buildGraphInput` needs:

```typescript
interface GraphInputContext {
	prompt: string; // User-facing input text
	apiKey: string; // Resolved API key
	modelName: string; // Resolved model (e.g. 'gpt-4o')
	providerId: string; // Resolved provider (e.g. 'openai')
	temperature: number; // Effective sampling temperature
	metadata?: Record<string, unknown>; // Opaque caller-supplied metadata
}
```

### Execution Protocols

The executor detects which protocol to use based on which hooks are present:

| Hooks Present                                           | Protocol              | Use Case                                            |
| ------------------------------------------------------- | --------------------- | --------------------------------------------------- |
| None                                                    | Plain chat completion | Simple LLM call, no graph                           |
| `buildGraph` only                                       | Messages protocol     | Graph with `{ messages }` channel                   |
| `buildGraph` + `buildGraphInput` + `extractGraphOutput` | Custom-state protocol | Graph with domain-specific state (e.g. WriterState) |

---

## 4. AI Executor

**File:** `src/main/ai/core/executor.ts`

### Three Execution Paths

The `executeAIAgentsStream()` async generator supports three paths:

**Path 1: Plain Chat Completion** (no `buildGraph`)

```
model.stream(messages) → token events → done event
```

**Path 2: Messages Protocol** (`buildGraph` only)

```
graph.stream({ messages: [...] }, { streamMode: 'messages' }) → token events → done event
```

**Path 3: Custom-State Protocol** (all three hooks)

```
buildGraphInput(ctx) → initialState
graph.stream(initialState, { streamMode: ['messages', 'values'] })
  → token events (from 'messages' mode)
  → state snapshots (from 'values' mode)
extractGraphOutput(finalState) → content fallback
```

### Custom-State Protocol (WriterState)

This is the path used by the Writing Assistant agent:

1. **Build initial state:** `buildGraphInput(ctx)` maps `GraphInputContext` → domain-specific fields
2. **Combined streaming:** Uses `streamMode: ['messages', 'values']` to get both:
   - Token-level chunks (forwarded incrementally as `token` events)
   - Full state snapshots after each node completes
3. **Content extraction:** Prefers streamed content; falls back to `extractGraphOutput(finalState)` for post-processed content

### Token Streaming

All three paths yield the same `AgentStreamEvent` types:

```typescript
type AgentStreamEvent =
	| { type: 'token'; token: string; runId: string }
	| { type: 'thinking'; content: string; runId: string }
	| { type: 'done'; content: string; tokenCount: number; runId: string }
	| { type: 'error'; error: string; code: string; runId: string };
```

---

## 5. Writing Assistant: Concrete Example

### Agent Definition

**File:** `src/main/ai/agents/writing_assistant/definition.ts`

```typescript
const definition: AgentDefinition = {
	id: 'writing-assistant',
	name: 'Writing Assistant',
	category: 'writing',
	role: 'completer', // Uses ModelRegistry['completer'] config
	buildGraph, // LangGraph factory from graph.ts

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			inputText: ctx.prompt,
			type: 'continue_writing',
			content: '',
			contentLength: ctx.metadata?.contentLength ?? 'short',
			completion: '',
			apiKey: ctx.apiKey,
			modelName: ctx.modelName,
			providerId: ctx.providerId,
			metadata: ctx.metadata,
		};
	},

	extractGraphOutput(state: Record<string, unknown>): string {
		return typeof state['completion'] === 'string' ? state['completion'] : '';
	},
};
```

### WriterState

**File:** `src/main/ai/agents/writing_assistant/state.ts`

```typescript
const WriterState = Annotation.Root({
	inputText: Annotation<string>, // Raw input text
	type: Annotation<string>, // Task type ('continue_writing')
	content: Annotation<string>, // Text passage to continue
	contentLength: Annotation<'short' | 'medium' | 'long'>, // Length constraint
	completion: Annotation<string>, // OUTPUT: generated text
	apiKey: Annotation<string>, // Injected by executor
	modelName: Annotation<string>, // Injected by executor
	providerId: Annotation<string>, // Injected by executor
	metadata: Annotation<Record<string, unknown> | undefined>, // Caller metadata
});
```

### Graph Topology

**File:** `src/main/ai/agents/writing_assistant/graph.ts`

```
START → continue_writing → END
```

Single-node graph. The `buildGraph` factory receives the resolved `BaseChatModel` and injects it into the node via closure:

```typescript
function buildGraph(model: BaseChatModel) {
	return new StateGraph(WriterState)
		.addNode('continue_writing', (state) => continueWritingNode(state, model))
		.addEdge(START, 'continue_writing')
		.addEdge('continue_writing', END)
		.compile();
}
```

### Node Implementation

**File:** `src/main/ai/agents/writing_assistant/nodes.ts`

The `continueWritingNode` function:

1. Selects the input text from `state.inputText` (falls back to `state.content`)
2. Builds messages: system prompt + length constraint prompt + user content
3. Streams tokens via `model.stream(messages)`
4. Accumulates into `completion` field
5. Returns `{ completion }` as partial state update

Length constraints:
| `contentLength` | Max Words |
|----------------|-----------|
| `short` | 10–15 |
| `medium` | 25–30 |
| `long` | 50–60 |

---

## 6. Metadata Flow

### End-to-End Path

Metadata is an opaque `Record<string, unknown>` that flows from the renderer all the way into the graph state:

```
Renderer                          Main Process                      AI Agent

DocumentPage                      TaskManagerIpc                    AgentTaskHandler
  task.submit(                      extracts metadata                 input.metadata
    { prompt },                     from options,                        │
    { metadata:                     injects into input                   v
      { positionFrom } }               │                          ExecutorInput.metadata
    )                                   │                                │
    │                                   v                                v
    v                             input = {                        GraphInputContext
  window.task.submit(               prompt,                          .metadata
    type,                           windowId,                            │
    input,                          metadata: {                          v
    { metadata }                      positionFrom                 buildGraphInput(ctx)
  )                                 }                                    │
                                  }                                      v
                                                                   WriterState.metadata
                                                                   = { positionFrom }
```

### Usage in WriterState

Inside the agent graph, any node can access metadata from the state:

```typescript
// Inside a graph node
function someNode(state: typeof WriterState.State) {
	const positionFrom = state.metadata?.positionFrom as number | undefined;
	// Use positionFrom to adjust behavior...
}
```

The Writing Assistant definition also uses metadata to configure `contentLength`:

```typescript
contentLength: ctx.metadata?.contentLength ?? 'short',
```

This allows the renderer to control the continuation length by passing:

```typescript
task.submit({ prompt }, { metadata: { contentLength: 'long' } });
```

---

## 7. Registration & Bootstrap

**File:** `src/main/bootstrap.ts`

### Wiring Order

Registration follows a strict dependency order:

```typescript
// 1. Create registries
const agentRegistry = new AgentRegistry();
agentRegistry.register(WritingAssistantAgent);

const modelRegistry = new ModelRegistry();
const taskHandlerRegistry = new TaskHandlerRegistry();

// 2. Create provider resolver (depends on StoreService)
const providerResolver = new ProviderResolver(storeService);

// 3. Register AgentTaskHandler for EACH agent definition
for (const def of agentRegistry.list()) {
	taskHandlerRegistry.register(
		new AgentTaskHandler(
			def.id, // e.g. 'writing-assistant'
			agentRegistry, // to look up the full definition at runtime
			providerResolver, // to resolve API keys and model defaults
			logger, // optional logging
			modelRegistry // optional role-based model config
		)
	);
}
// Handler registered as type 'agent-writing-assistant'

// 4. Create TaskExecutor with the populated handler registry
const taskExecutor = new TaskExecutor(taskHandlerRegistry, eventBus, 10, logger);

// 5. Register IPC modules (TaskManagerIpc connects the executor to IPC channels)
new TaskManagerIpc().register(container, eventBus);
```

### Adding a New Agent

To add a new agent to the system:

1. **Create agent directory:** `src/main/ai/agents/{agent_name}/`

2. **Define the state** (`state.ts`):

   ```typescript
   export const MyAgentState = Annotation.Root({
   	inputField: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
   	outputField: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
   	metadata: Annotation<Record<string, unknown> | undefined>({
   		reducer: (_a, b) => b,
   		default: () => undefined,
   	}),
   	// ... provider fields (apiKey, modelName, providerId)
   });
   ```

3. **Implement nodes** (`nodes.ts`):

   ```typescript
   export async function myNode(
   	state: typeof MyAgentState.State,
   	model: BaseChatModel
   ): Promise<Partial<typeof MyAgentState.State>> {
   	// ... call model, process, return partial state
   }
   ```

4. **Build graph** (`graph.ts`):

   ```typescript
   export function buildGraph(model: BaseChatModel) {
   	return new StateGraph(MyAgentState)
   		.addNode('my_node', (state) => myNode(state, model))
   		.addEdge(START, 'my_node')
   		.addEdge('my_node', END)
   		.compile();
   }
   ```

5. **Create definition** (`definition.ts`):

   ```typescript
   const definition: AgentDefinition = {
     id: 'my-agent',
     name: 'My Agent',
     category: 'writing',
     role: 'writer',              // Optional: ModelRegistry role
     buildGraph,
     buildGraphInput(ctx) { ... },
     extractGraphOutput(state) { ... },
   };
   export { definition as MyAgent };
   ```

6. **Register in bootstrap** (`src/main/bootstrap.ts`):

   ```typescript
   import { MyAgent } from './ai/agents/my_agent/definition';
   agentRegistry.register(MyAgent);
   ```

7. **Export from AI module** (`src/main/ai/index.ts`):
   ```typescript
   export { MyAgent } from './agents/my_agent/definition';
   ```

The `AgentTaskHandler` loop in bootstrap automatically creates a task handler for the new agent. No manual handler registration needed.

---

## 8. Supporting Infrastructure

### AgentRegistry

**File:** `src/main/ai/core/agent-registry.ts`

Simple named map of agent ID → `AgentDefinition`. Methods:

| Method          | Description                          |
| --------------- | ------------------------------------ |
| `register(def)` | Add an agent definition              |
| `get(id)`       | Retrieve by ID (throws if not found) |
| `has(id)`       | Check if registered                  |
| `list()`        | Return all definitions               |

### ModelRegistry

**File:** `src/main/ai/registry/model-registry.ts`

Maps functional roles to model configurations:

```typescript
type ModelRole =
	| 'supervisor'
	| 'writer'
	| 'editor'
	| 'heavy-editor'
	| 'analyzer'
	| 'completer'
	| 'general';

interface ModelRoleConfig {
	providerId: string; // e.g. 'openai'
	modelId: string; // e.g. 'gpt-4o-mini'
	temperature: number; // e.g. 0.4
	maxTokens?: number;
	description: string;
	costTier: 'economy' | 'standard' | 'premium';
}
```

Example: the `completer` role (used by Writing Assistant) defaults to `gpt-4o-mini` with temperature `0.4` at the `economy` cost tier.

### ProviderResolver

**File:** `src/main/shared/provider-resolver.ts`

Centralizes API key and model resolution from persisted user settings:

```
resolve({ providerId?, modelId? }) → ResolvedProvider { apiKey, modelName, providerId }
```

Resolution priority: explicit overrides → stored settings → environment variables → hardcoded defaults.

---

## 9. File Reference

### TaskManager Side

| File                                                   | Purpose                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `src/main/task_manager/task-handler.ts`                | `TaskHandler`, `ProgressReporter`, `StreamReporter` interfaces |
| `src/main/task_manager/task-handler-registry.ts`       | Type → handler map                                             |
| `src/main/task_manager/task-executor.ts`               | Queue, concurrency, lifecycle management                       |
| `src/main/task_manager/task-descriptor.ts`             | `TaskOptions`, `ActiveTask` types                              |
| `src/main/task_manager/handlers/agent-task-handler.ts` | **Bridge** — sole import boundary between subsystems           |

### AI Agent Side

| File                                     | Purpose                                           |
| ---------------------------------------- | ------------------------------------------------- |
| `src/main/ai/core/definition.ts`         | `AgentDefinition`, `GraphInputContext`            |
| `src/main/ai/core/executor.ts`           | `executeAIAgentsStream()` — three execution paths |
| `src/main/ai/core/agent-registry.ts`     | Named agent definition registry                   |
| `src/main/ai/core/types.ts`              | `AgentStreamEvent`, `AgentHistoryMessage`         |
| `src/main/ai/registry/model-registry.ts` | Role-based model/provider assignments             |

### Writing Assistant Agent

| File                                                 | Purpose                                                   |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `src/main/ai/agents/writing_assistant/definition.ts` | Agent definition + `buildGraphInput`/`extractGraphOutput` |
| `src/main/ai/agents/writing_assistant/state.ts`      | `WriterState` LangGraph annotation                        |
| `src/main/ai/agents/writing_assistant/graph.ts`      | Graph topology (`START → continue_writing → END`)         |
| `src/main/ai/agents/writing_assistant/nodes.ts`      | `continueWritingNode` implementation                      |

### Infrastructure

| File                                          | Purpose                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `src/main/bootstrap.ts`                       | Service wiring and registration                     |
| `src/main/shared/provider-resolver.ts`        | API key and model resolution                        |
| `src/main/ipc/task-manager-ipc.ts`            | IPC channel registration, metadata injection        |
| `src/shared/types.ts`                         | Shared IPC types (`TaskSubmitOptions`, `TaskEvent`) |
| `src/preload/index.ts`                        | `window.task.submit()` bridge                       |
| `src/renderer/src/hooks/use-task.ts`          | Local-state task hook                               |
| `src/renderer/src/hooks/use-task-submit.ts`   | Redux-backed task hook                              |
| `src/renderer/src/services/task-event-bus.ts` | Renderer event snapshot management                  |
