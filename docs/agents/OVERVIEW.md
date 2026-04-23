# Overview

## What An Agent Is

In OpenWriter, an **agent** is a single reusable unit of AI behavior:

- It has a **type id** (e.g. `writer`, `assistant`, `rag`).
- It takes a typed **input** and returns a typed **output**.
- It runs inside an **execution context** that provides cancellation,
  logging, progress reporting, and an event channel back to the
  renderer.

Every agent implements the same small interface:

```ts
interface Agent<TInput, TOutput> {
  readonly type: string;
  validate?(input: TInput): void;
  execute(input: TInput, ctx: AgentContext): Promise<TOutput>;
}

interface AgentContext {
  readonly signal: AbortSignal;
  readonly logger: LoggerService;
  readonly progress?: (percent: number, message?: string) => void;
  readonly onEvent?: (event: AgentEvent) => void;
  readonly metadata?: Record<string, unknown>;
}
```

Source: `src/main/agents/core/agent.ts`.

## Why Split Into Agents At All

A single "do everything" model call is fine for demos but fragile in a
product. Splitting by capability gets:

- **Testability** — each agent has a small contract.
- **Configurability** — the user picks a provider/model per agent.
- **Reuse** — the same agent serves the editor, the chat panel,
  extensions, and internal workflows.
- **Observability** — events are uniformly typed so the UI can render
  progress for any agent.

## Runtime Model

Everything happens in the main process. The renderer submits a task;
the main process dispatches it.

```text
Renderer
  │
  ▼ window.task.submit({ type: 'agent', input: { agentType, input } })
  │
Main process
  │
  ▼ TaskExecutor
  │
  ▼ TaskHandlerRegistry.get('agent')   ── AgentTaskHandler
  │
  ▼ enrich input (providerId, apiKey, modelName, skills?)
  │
  ▼ AgentRegistry.get(agentType).execute(input, ctx)
  │
  ▼ agent runs:
        loops / streams / emits events
  │
  ▼ events flow back via ctx.onEvent → TaskExecutor → task:event IPC
```

Two side quests use dedicated handlers instead of the generic
`AgentTaskHandler`:

- **`transcription`** — `TranscriptionTaskHandler` (different input
  shape, no skill catalog injection)
- **Indexing** — the RAG agent's `ingest` mode is triggered the same
  way but operates on arrays of documents rather than a single prompt

## Registration

All agents are registered once at boot in `src/main/bootstrap.ts`:

```ts
const agentRegistry = new AgentRegistry();
agentRegistry.register(new AssistantAgent());
agentRegistry.register(new WriterAgent());
agentRegistry.register(new RagAgent());
agentRegistry.register(new OcrAgent());
agentRegistry.register(new TranscriptionAgent());
```

Adding a new agent means:

1. Writing a class that extends `BaseAgent`.
2. Registering an instance here.
3. Optionally adding a dedicated task handler if the input shape is
   very different.

See [AUTHORING.md](./AUTHORING.md).

## Lifecycle Of A Single Run

For each agent run:

1. **Validate** — `agent.validate(input)` throws if the input is
   malformed. The handler catches and fails the task before spending
   API credits.
2. **Enrich** — `AgentTaskHandler.enrichInput` fills in
   `providerId` / `apiKey` / `modelName` from Settings unless provided.
   For the writer agent, it also loads the current skill catalog.
3. **Execute** — `agent.execute(input, ctx)` runs. The agent is free
   to call any number of LLM / tool / filesystem operations inside this
   call.
4. **Emit** — during execution the agent calls `ctx.onEvent(...)` with
   typed events. The handler forwards them to the renderer.
5. **Return** — the agent returns its structured output. The handler
   normalizes it to `AgentCompletedOutput` (`{ content, stoppedReason }`)
   and resolves the task.

## Event Vocabulary

Agents emit events with a `kind` and `payload`. A non-exhaustive list:

| Kind | Meaning |
| --- | --- |
| `intent` | Classification result from a writer-style intent node |
| `decision` | Controller's chosen action (`text`, `skill`, `done`) |
| `skill:selected` | A skill was chosen; name + instruction |
| `text` | A single streamed token |
| `tool` | A tool call started or finished |
| `image` | An image was saved to disk |
| `phase` | High-level phase label (_Thinking_, _Writing_, …) |
| `status` | Top-level lifecycle marker |
| `delta` | Handler's editor-shaped projection — `{ token, fullContent }` |

The handler's `recordEvent` sink both persists each event on the task
record (so late subscribers can reconstruct history) and forwards the
event to the renderer's `task:event` channel.

## Cancellation

Every call carries an `AbortSignal`. Agents must:

- Pass `signal` through to every LLM or network call.
- Check `signal.aborted` before long loops.
- Throw an `AbortError` (the `DOMException('Aborted', 'AbortError')`
  pattern) when cancelled.

Cancellation is cooperative but propagation is expected everywhere.

## Concurrency

The task executor runs up to 10 concurrent agent tasks (configured in
`bootstrap.ts`). Priorities (`high` / `normal` / `low`) reorder the
queue before start. Already-running tasks are not preempted.

## Provider Model

Agents are **provider-agnostic**. They use a small factory layer:

- `createOpenAIClient(providerId, apiKey)` (chat, images, audio)
- `createChatModel(...)` (streaming-aware wrapper)
- `createEmbeddingModel(...)` (embeddings)

Providers share the OpenAI-compatible HTTP surface. Anthropic is
reached via its `/v1/` base URL. See `src/main/shared/` for the
factories.

## Guardrails Already Built In

- `validate` throws before any API call.
- Tool calls (read/write/edit/find/grep/ls/generate_image) resolve
  paths inside a bounded `cwd` and reject escapes.
- File writes go through a per-file mutation queue so concurrent
  writers cannot interleave.
- Reasoning models (`o1`, `o3`, `o4-mini`, …) skip unsupported
  parameters like `temperature` automatically.
- RAG answers are anchored to retrieved chunks with a strict system
  prompt.

## What Agents Are Not

- Not React components. No UI. Agents live in the main process.
- Not services with lifecycle. They are stateless strategy objects —
  state lives in the task record or the workspace.
- Not remote. Everything runs locally (except the provider HTTP calls
  they make).
