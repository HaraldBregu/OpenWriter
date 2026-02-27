# AI Agent Architect Memory — tesseract-ai

## Project Stack
- Electron + TypeScript (strict mode, no `any`, no `!` assertions)
- Build: `yarn typecheck` runs `tsc --noEmit` on both tsconfig.node.json and tsconfig.web.json
- Lint: `yarn lint` — 0 errors expected (128 warnings baseline as of 2026-02)
- Agent logic lives exclusively in `src/main/` — nothing agent-related in `src/renderer/`

## AgentManager System (`src/main/agentManager/`)
- `AgentManagerTypes.ts` — `AgentSessionConfig`, `AgentRequest`, `AgentStreamEvent`, `AgentSessionSnapshot`
- `AgentSession.ts` — pure session class; defaults: temperature 0.7, maxHistory 50, systemPrompt 'You are a helpful AI assistant.'
- `AgentManager.ts` — session lifecycle + run lifecycle; uses `ProviderResolver` for provider lookup
- `AgentExecutor.ts` — async generator streaming via LangChain ChatOpenAI
- `AgentRegistry.ts` — singleton `agentRegistry`; throws on duplicate ids; `buildSessionConfig()` helper
- `AgentDefinition.ts` — `AgentDefinition` interface + `AgentDefinitionInfo` IPC-safe snapshot + `toAgentDefinitionInfo()`
- `agents/` — self-registering named agent files (side-effect imports)
- `index.ts` — barrel; `import './agents'` at bottom to self-register all agents on any barrel import

## Named Agent Registration Pattern
Each agent file: (1) defines `const definition: AgentDefinition`, (2) calls `agentRegistry.register(definition)`, (3) exports with a named constant (`StoryWriterAgent`, etc.).
The `agents/index.ts` barrel imports all files as side effects then re-exports named constants.
`agentManager/index.ts` does `import './agents'` so any consumer of the barrel gets all agents registered for free.

## Built-in Named Agents
| id | category | temperature | purpose |
|----|----------|-------------|---------|
| story-writer | writing | 0.9 | Creative narrative fiction |
| text-completer | writing | 0.4 | Style-faithful text continuation |
| content-review | editing | 0.3 | Structured editorial feedback (4 sections) |
| summarizer | analysis | 0.3 | High-fidelity long-form summarisation |
| tone-adjuster | editing | 0.6 | Tone rewriting (formal/casual/persuasive/etc.) |

## LangGraph Integration (`@langchain/langgraph@1.2.0` installed)
- `AgentDefinition.buildGraph?: (model: BaseChatModel) => CompiledStateGraph<any,any,any,any,any,any>` — optional graph factory
- `AgentSessionConfig.buildGraph` carries the factory from definition through to `AgentSession`
- `AgentSession.buildGraph` — stored from config, NOT serialized in `toSnapshot()` (functions can't cross IPC)
- `AgentExecutor` — if `input.buildGraph` is present, runs `executeGraphStream` using `streamMode:"messages"`; otherwise falls back to plain chat completion
- `buildSessionConfig()` in AgentRegistry propagates `buildGraph` with: `overrides.buildGraph ?? def.buildGraph`
- All 5 agents now implement `buildGraph` with real StateGraph topologies (see patterns.md)
- `streamMode:"messages"` yields `[chunk, metadata]` tuples; extract content via `extractTokenFromChunk(chunk.content)`
- Use `eslint-disable @typescript-eslint/no-explicit-any` on `CompiledStateGraph<any,any,any,any,any,any>` — 6 type params required, inference is impractical here
- Lint baseline: 122 warnings, 0 errors (was 128 before this change)

## Key Conventions
- `AgentDefinition.defaultConfig` has optional `providerId` — callers must supply a real one via `buildSessionConfig(def, providerId, overrides?)`
- `AgentDefinitionInfo` is the IPC-safe projection — use `listInfo()` or `toAgentDefinitionInfo()` before sending to renderer
- `AgentRegistry.register()` throws on duplicate ids — this is intentional (catches copy-paste errors early)
- `buildSessionConfig()` override precedence: `overrides` > `defaultConfig` > `AgentSession` class defaults; `providerId` arg always wins
