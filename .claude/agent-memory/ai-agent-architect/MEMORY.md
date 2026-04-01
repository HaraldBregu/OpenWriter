# AI Agent Architect Memory — OpenWriter

## Project Stack
- Electron + TypeScript (strict mode, no `any`, no `!` assertions)
- Build: `yarn typecheck` runs `tsc --noEmit` on both tsconfig.node.json and tsconfig.web.json
- Lint: `yarn lint` — 0 errors expected (128 warnings baseline as of 2026-02)
- Agent logic lives exclusively in `src/main/` — nothing agent-related in `src/renderer/`

## Actual Agent Architecture (confirmed 2026-03)
See [agent-architecture.md](agent-architecture.md) for full detail.

Key files:
- `src/main/ai/core/definition.ts` — `AgentDefinition` interface; `GraphInputContext`; `NodeModelConfig`; `NodeModelMap`
- `src/main/ai/core/executor.ts` — `executeAIAgentsStream()` async generator; 3 paths: plain/messages/custom-state
- `src/main/ai/core/types.ts` — `AgentStreamEvent`, `AgentHistoryMessage`, `AgentRequest` (re-exports from shared/types)
- `src/main/ai/core/agent-registry.ts` — `AgentRegistry` class
- `src/main/ai/agents/` — one folder per agent; each has `definition.ts`, `graph.ts`, `state.ts`, `*-node.ts`
- `src/main/task/handlers/agent-task-handler.ts` — bridges TaskExecutor → executeAIAgentsStream
- `src/main/bootstrap.ts` — `bootstrapServices()` + `bootstrapIpcModules()`

## IPC Architecture Pattern
- `src/shared/channels.ts` — single source of truth for all channel names + `InvokeChannelMap`, `SendChannelMap`, `EventChannelMap`
- `src/shared/types.ts` — all shared data shapes (AgentStreamEvent, TaskEvent, etc.)
- `src/main/ipc/ipc-gateway.ts` — `registerQuery`, `registerCommand`, `registerCommandWithEvent`
- `src/main/ipc/ipc-module.ts` — `IpcModule` interface (`register(container, eventBus)`)
- `src/main/core/event-bus.ts` — `EventBus`; `broadcast(channel, ...args)`, `sendTo(windowId, channel, ...args)`, typed `emit/on` for main-process events
- `src/preload/index.ts` — exposes `window.app`, `window.win`, `window.workspace`, `window.task`
- `src/preload/typed-ipc.ts` — `typedInvoke`, `typedInvokeUnwrap`, `typedInvokeRaw`, `typedSend`, `typedOn`
- `src/preload/index.d.ts` — `AppApi`, `WindowApi`, `WorkspaceApi`, `TaskApi`; global `Window` augmentation

## Agent Graph Pattern (custom-state protocol)
- State: `Annotation.Root({...})` with `reducer: (_a, b) => b` for overwrite fields
- Graph: `new StateGraph(State).addNode().addEdge().compile()`
- Node: pure `async function (state, model) → Partial<State>` — never creates models, receives via closure
- Definition: `buildGraph` + `buildGraphInput(ctx) → Record<string,unknown>` + `extractGraphOutput(state) → string`
- `nodeModels: Record<string, NodeModelConfig>` on the definition → `AgentTaskHandler` resolves per-node models → passes `NodeModelMap` to `buildGraph`
- `streamableNodes: string[]` filters which nodes emit tokens to renderer
- Streaming: `streamMode: ['messages', 'values']`; 'messages' → token events; 'values' → finalState for extractGraphOutput

## Provider Resolution
- `src/main/shared/provider-resolver.ts` — `ProviderResolver.resolve({ providerId?, modelId? }) → ResolvedProvider`
- `src/main/shared/chat-model-factory.ts` — `createChatModel(opts) → ChatOpenAI`
- `src/main/shared/ai-utils.ts` — `extractTokenFromChunk`, `classifyError`, `toUserMessage`

## Registered Agents (bootstrap.ts)
- TextCompleterAgent, TextEnhanceAgent, TextWriterAgent, ImageGeneratorAgent
- Each auto-registered in bootstrap via `agentRegistry.register()`
- Each accessed as `window.task.submit('agent-{id}', { prompt })` from renderer

## Researcher Architecture (designed 2026-03)
See [researcher-architecture.md](researcher-architecture.md) for complete specification.
- Separate from TaskExecutor/AgentRegistry system
- `src/main/ai/researcher/` — self-contained module
- Channels: `researcher:query`, `researcher:cancel`, `researcher:event`
- Window API: `window.researcher.query(...)`, `window.researcher.cancel(...)`, `window.researcher.onEvent(...)`

## RAG System (implemented 2026-04)
- `src/main/ai/indexing/json-vector-store.ts` — `JsonVectorStore` — brute-force cosine similarity, JSON-file backed; `load(storePath, embeddings)`, `similaritySearchWithScore(query, k)`
- Vector store path: `{workspacePath}/data/vector_store/` (populated by `IndexResourcesTaskHandler`)
- `src/main/ai/agents/assistant/nodes/rag-retriever.ts` — `RagRetriever` class; wraps `JsonVectorStore.load()`; lazy-loads once; gracefully returns `[]` when store is missing
- `src/main/ai/agents/assistant/nodes/rag-node.ts` — `ragNode(state, retriever) → { ragContext }` — node function; skips retrieval on empty prompt; joins docs with `\n\n---\n\n`
- `src/main/ai/agents/assistant/state.ts` — `AssistantState` includes `ragContext: Annotation<string>` (overwrite reducer)
- Tests: `tests/unit/main/ai/assistant/RagNode.test.ts` — 16 tests covering RagRetriever + ragNode; mocks `JsonVectorStore.load` at module level
- Embedding: `src/main/shared/embedding-factory.ts` — `createEmbeddingModel(opts) → OpenAIEmbeddings`
- Pre-existing TypeScript error in `src/preload/index.ts` (WorkspaceInfo shape mismatch) — not caused by RAG work
