# Agent Streaming

How the assistant agent's typed events reach the document file, the task
record, and the renderer in real time.

## Goal

While an `agent` task runs, three things must happen live:

1. Generated text is appended to the document file (`content.md`) token
   by token, without the agent itself touching the filesystem.
2. Every event emitted by the agent is persisted on the `ActiveTask`
   record so callers can observe progress via `task:get` / `task:list`.
3. The renderer receives each event via the `task:event` bus and decides
   how to render it (document editor for `text`, timeline for the rest).

The agent emits a stream of typed `AgentEvent`s. The task handler
inspects `kind`, drives side effects, and forwards every event to the
task-level `recordEvent` sink.

## Event shape

```ts
interface AgentEvent {
  kind: string;       // e.g. 'text', 'status', 'decision', 'tool', 'image',
                      //      'step:begin', 'step:end', 'skill:selected', ...
  at: number;         // epoch ms
  payload: unknown;   // shape specific to `kind`
}
```

The assistant agent reuses its existing `StateEvent` taxonomy; each
state-level event is cast to `AgentEvent` at the subscription boundary
without JSON stringification.

| `kind`              | Payload                                      | Handler side effect                              |
| ------------------- | -------------------------------------------- | ------------------------------------------------ |
| `text`              | `{ text: string }`                           | Append to `content.md` + bump token count + ramp progress |
| `status`            | `{ status: 'running' \| 'done' \| ...}`      | Forward only                                     |
| `decision`          | `{ action, instruction?, reason?, ... }`    | Forward; progress back to 0                      |
| `decision:invalid`  | `{ raw, error }`                             | Forward; progress back to 0                      |
| `skill:selected`    | `{ skillName, instruction? }`                | Forward; progress back to 0                      |
| `step:begin`        | `StepRecord`                                 | Forward; progress back to 0                      |
| `step:end`          | `StepRecord`                                 | Forward; progress back to 0                      |
| `tool`              | `AssistantToolCallRecord`                    | Forward                                          |
| `image`             | `{ relativePath, prompt }`                   | Forward                                          |
| `usage`             | `UsageRecord`                                | Forward                                          |
| `budget`            | `BudgetRecord`                               | Forward                                          |

Adding a new event kind never requires handler changes unless it should
influence `content.md` writes or progress — in that case extend the
`if (event.kind === 'text')` branch in `AgentTaskHandler.execute`.

## Pipeline

```mermaid
flowchart LR
    subgraph Agent[AssistantAgent]
        Controller[ControllerNode<br/>callChat] --> State
        TextNode[TextNode<br/>streamChat] -->|text deltas| State[AssistantState]
    end
    State -->|typed StateEvent| Subscribe[state.subscribe]
    Subscribe -->|ctx.onEvent| Handler[AgentTaskHandler.onEvent]
    Handler -->|text delta| Writer[DocumentStreamWriter]
    Handler -->|reporter.progress| Reporter[ProgressReporter]
    Handler -->|recordEvent| Executor[TaskExecutor]
    Executor -->|ActiveTask.events[]| Task[(ActiveTask)]
    Executor -->|task:event running| Renderer
    Writer -->|fs.write| ContentMd[(content.md)]
    Reporter -->|task:event running| Renderer[Renderer IPC]
```

Three terminals per `text` delta:

1. `content.md` on disk (via `DocumentStreamWriter`)
2. `ActiveTask.events[]` in memory
3. `task:event` with `{ data: { event } }` to the renderer

The renderer filters by `event.kind`: `text` → append to the document
editor, everything else → timeline entry.

## Components

### `AgentContext` — `src/main/agents/core/agent.ts`

```ts
interface AgentContext {
  readonly signal: AbortSignal;
  readonly logger: LoggerService;
  readonly progress?: (percent: number, message?: string) => void;
  readonly onEvent?: (event: AgentEvent) => void;
  readonly metadata?: Record<string, unknown>;
}
```

No more `ctx.stream(string)`. Agents emit typed events via `ctx.onEvent`.
`ctx.progress` remains for phase-based agents (e.g. `RagAgent`); the
assistant agent does not use it — its handler drives progress from
events.

### `AssistantAgent` — `src/main/agents/assistant/assistant-agent.ts`

Subscribes once at the top of `run` and forwards each `StateEvent` to
`ctx.onEvent`:

```ts
const unsubscribe = state.subscribe((event) => {
  ctx.onEvent?.({ kind: event.kind, at: event.at, payload: event.payload });
});
```

Controller loop no longer calls `ctx.progress`. Progress is computed by
the handler from the event stream.

### `TextNode` — `src/main/agents/assistant/nodes/text-node.ts`

Calls `streamChat` with `onContentDelta: (delta) => state.emitTextDelta(delta)`.
`AssistantState.emitTextDelta` emits a `text` event per chunk.
Registered tools: `read` only — file writes belong to the handler, not
the agent.

### `streamChat` — `src/main/agents/assistant/llm-call.ts`

Wraps `client.chat.completions.create({ stream: true, stream_options:
{ include_usage: true } })`. Returns a `ChatCompletion`-shaped aggregate
so callers reuse the same post-processing as `callChat`. No retry — use
`callChat` for idempotent re-attempts.

### `DocumentStreamWriter` — `src/main/task/handlers/document-stream-writer.ts`

Owns the lifecycle of one document stream for one task run.

```
begin()         mkdir -p, truncate file to empty, open FileHandle in 'w' mode
appendDelta(d)  schedule a write on an internal promise chain (fire-and-forget)
end()           await the chain, close the FileHandle; idempotent
```

`begin()` is serialized against other writers on the same path via
`withFileMutationQueue`. `appendDelta` writes are serialized per writer
via an internal `Promise` chain; per-write errors are caught so the
chain survives and subsequent deltas still flush.

### `AgentTaskHandler` — `src/main/task/handlers/agent-task-handler.ts`

On `execute`:

1. `enrichInput` resolves credentials, `documentPath`, `workspacePath`.
2. `initDocumentWriter` opens and truncates `content.md` when
   `documentPath` is present. Failure is logged and the writer is
   dropped — the agent still runs, with file writes disabled.
3. `reporter.progress(0, 'reasoning')` publishes the initial state.
4. `agent.execute` is invoked with a `ctx.onEvent` that:
   - for `kind === 'text'`: appends the delta to the writer, bumps the
     token count, and reports `reporter.progress(rampPct(tokens), 'response')`;
   - for any other kind: reports `reporter.progress(0, 'reasoning')`;
   - always calls `recordEvent(event)` to persist + forward to the renderer.
5. On resolve: `writer.end()`, `reporter.progress(100, 'done')`.
6. On reject: `writer.end()` still runs (finally-style); partial
   `content.md` is preserved.

### `RecordEvent` — `src/main/task/task-handler.ts`

Single sink passed to every handler. Replaces the previous
`StreamReporter` + `TaskStateWriter` pair.

```ts
type RecordEvent = (event: AgentEvent) => void;
```

### `TaskExecutor` — `src/main/task/task-executor.ts`

Builds `recordEvent` inline per task:

```ts
const recordEvent: RecordEvent = (event) => {
  const current = this.activeTasks.get(taskId);
  if (!current) return;
  (current.events ??= []).push(event);
  this.send(windowId, 'task:event', {
    state: 'running',
    taskId,
    data: { event },
    error: null,
    metadata: task.metadata,
  });
};
```

`listTasks()` includes a shallow copy of `events` so readers see the
live log without mutation risk.

### `ActiveTask` — `src/main/task/task-descriptor.ts`

| Field | Type | Meaning |
| --- | --- | --- |
| `events` | `AgentEvent[]?` | Ordered log of every typed event observed, present only on event-emitting handlers |

The previous `reasoningLog`, `streamedContent`, and `tokenCount` fields
have been removed. Consumers derive what they need from `events`:
`streamedContent` = `events.filter(e => e.kind === 'text').map(e => e.payload.text).join('')`.

## Progress semantics

| Phase              | Percent                              |
| ------------------ | ------------------------------------ |
| Pre-run            | `0, 'reasoning'`                     |
| Non-`text` event   | `0, 'reasoning'`                     |
| `text` event       | `rampPct(tokens), 'response'`        |
| Success            | `100, 'done'`                        |

`rampPct(n) = min(99, round(n * 0.5))`. 200 deltas saturate the cap at
99 %; the jump to 100 % only happens on completion.

## Task record lifecycle (example)

```
submit     → status='queued'                                       events=undefined
started    → status='running'                                      (unchanged)
status     → events=[{kind:'status',payload:{status:'running'}}]   progress=0
step:begin → events=[..., {kind:'step:begin', ...}]                progress=0
decision   → events=[..., {kind:'decision',   payload:{action:'text'}}] progress=0
text       → events=[..., {kind:'text',       payload:{text:'Hello'}}]  progress=1
text       → events=[..., {kind:'text',       payload:{text:', '}}]      progress=1
...                                                                 progress ramps to 99
step:end   → events=[..., {kind:'step:end', ...}]                  progress=0
status     → events=[..., {kind:'status', payload:{status:'done'}}]
done       → status='completed'                                    progress=100
```

## Renderer contract

The renderer subscribes to `task:event` and routes by `event.kind`:

- `kind === 'text'` → append `payload.text` to the document editor buffer.
- everything else  → add a timeline entry with `kind`, `at`, and a
  renderer-local label derived from `payload`.

Progress events (`data.percent`) update a global progress indicator;
they are a separate `data` shape on the same `task:event` channel.

## Error handling

| Failure | Effect |
| --- | --- |
| `writer.begin()` fails | Writer dropped, warning logged; agent still runs with file writes disabled |
| `writer.write()` fails mid-stream | Error caught on the chain, logged; subsequent writes still flush |
| Agent throws `AbortError` | `writer.end()` in catch; task `cancelled`; partial `content.md` retained |
| Agent throws (other) | `writer.end()` in catch; task `error`; partial `content.md` retained |
| No `documentPath` resolved | No writer created; events still populate `ActiveTask.events` and reach the renderer |

## Known limitations

- **Content leakage on tool-call iterations.** `streamChat` emits deltas
  live. If the model produces content *and* a tool call in the same
  iteration, the content has already been written to `content.md`
  before the tool call is known. With only `read` registered this is
  uncommon in practice.
- **Concurrent tasks on the same document.** `withFileMutationQueue`
  serializes `begin()`, but two writers may hold open `FileHandle`s on
  the same path simultaneously. If task B calls `begin()` while task A
  is still appending, B's `'w'` open truncates the file. Queue this at
  the task-submit layer if concurrent edits become real.
- **No resume.** `content.md` is truncated at task start. If the user
  cancels, the previous document state is gone.
- **Progress ramp caps early.** `rampPct` saturates at ~200 tokens; the
  bar sits at 99 % for the remainder of long generations.

## Extension points

- **New event kind.** Emit it from the agent via `ctx.onEvent`. No
  handler change unless it should influence file writes or progress.
- **New event-emitting handler.** Implement `TaskHandler`, accept the
  `recordEvent` parameter, and call it with `AgentEvent`-shaped values.
  The executor forwards them to the renderer and persists them on
  `ActiveTask.events`.
- **Debounced writes.** Replace the per-delta `handle.write` with a
  buffered flush inside `DocumentStreamWriter`. The public API does
  not change.
- **Budget-aware progress.** Swap `rampPct` for a `tokens / maxTokens`
  calculation. The token counter already lives inside `AgentTaskHandler.execute`.

## Touched files

```
src/main/agents/core/agent.ts                       add  — AgentEvent, onEvent; remove stream
src/main/task/task-handler.ts                       refactor — RecordEvent; remove StreamReporter, TaskStateWriter
src/main/task/task-descriptor.ts                    refactor — events[] field; remove reasoningLog/streamedContent/tokenCount
src/main/task/task-executor.ts                      refactor — recordEvent closure; new execute() call shape
src/main/task/handlers/agent-task-handler.ts        refactor — typed onEvent dispatch, shrink by ~60%
src/main/task/handlers/demo-task-handler.ts         refactor — recordEvent replaces streamReporter
src/main/agents/assistant/assistant-agent.ts        refactor — ctx.onEvent; remove ctx.progress calls
src/main/agents/rag/rag-agent.ts                    refactor — ctx.onEvent emits text events
src/shared/types.ts                                 docs   — TaskEvent.data shape for running state
```
