# The AI Agent Loop

The defining feature of OpenWriter: writing is produced by a **loop of
agents** working together, not by one prompt-to-completion call.

This document describes the loop from a functional standpoint — what the
agents decide, what the user sees, and where the loop stops. For the
streaming / IPC plumbing see [../AGENT_STREAMING.md](../AGENT_STREAMING.md).

## Why A Loop, Not A Single Call?

A naive writing assistant sends one prompt and streams one completion.
That's fine for short edits but fails when:

- The intent is ambiguous ("help me here" — write? rewrite? continue?)
- A named skill in the user's catalog matches and should drive style
- The agent needs multiple passes (outline, then draft, then image)
- The user wants the same input to produce text _and_ a generated image

OpenWriter runs a small controller loop that makes the action explicit
step-by-step and streams tokens as each step produces output.

## The Writer Loop

The primary agent used from the document page is the **Writer agent**
(`src/main/agents/writer/writer-agent.ts`). Its loop has three named
nodes:

```mermaid
flowchart LR
    Start([Prompt submitted])
    Intent[IntentNode<br/>classify intent]
    Controller[ControllerNode<br/>decide next action]
    Text[TextNode<br/>stream text or run skill]
    Done([stoppedReason])

    Start --> Intent --> Controller
    Controller -->|action: "text"| Text --> Done
    Controller -->|action: "skill"| Text --> Done
    Controller -->|action: "done"| Done
    Text -.->|append to history, loop| Controller
```

Steps:

1. **IntentNode** classifies the user's request into one of:
   `write-new`, `continue`, `summarize`, `rewrite`, `answer`, `other`.
   This is a one-shot JSON structured output call.

2. **ControllerNode** picks the next action given intent + history +
   the available skill catalog:
   - `text` → run the text worker with a freshly composed instruction
   - `skill` → same, but with a named skill loaded into the system prompt
   - `done` → the request is satisfied, exit the loop
3. **TextNode** streams model output back as `text` deltas. Each delta
   is forwarded to the agent handler and on to the renderer.

4. After TextNode completes, its result is appended to the loop history.
   The loop then either exits (the writer currently exits after one
   `text` or `skill` step) or continues until `maxSteps` is reached.

The loop is bounded by:

- `maxSteps` — default 3
- `perCallTimeoutMs` — default 90 s per underlying LLM call
- `ctx.signal.aborted` — user cancellation

`stoppedReason` in the output is one of `done` or `max-steps`.

## Why The Writer Keeps The Loop Small

A bigger loop would be more "autonomous" but less predictable. For a
writing product the model is supposed to produce text the user reads and
accepts — not run off and do seven things. The loop exists so that:

- **Skills** can participate (controller can pick one explicitly)
- **Image generation** can be scheduled inside the same run
- The app can **retry** inside a bounded envelope if intermediate
  output is weak

## The Assistant Path (Simpler)

The **Assistant agent** (`src/main/agents/assistant/assistant-agent.ts`)
is the minimal case: no loop, no intent classification — just a single
streaming chat call with a writing-assistant system prompt.

This is used for quick actions where controller overhead isn't worth
the latency. The writer is the default; the assistant is available for
callers that want raw streaming.

## The RAG Path (Branching)

The **RAG agent** (`src/main/agents/rag/rag-agent.ts`) implements a
retrieval loop with two phases:

- **Ingest** — chunk the user's documents, embed chunks, persist to an
  in-memory vector store.
- **Query** — embed the query, retrieve top-K chunks, pass them as
  context to a chat model, stream the answer.

Functionally this is a separate agent the user can reach for
research-grounded writing.

## Events Emitted During A Run

Each loop step emits **typed events** the renderer consumes live:

| Event `kind` | Meaning |
| --- | --- |
| `intent` | Classification result from IntentNode |
| `decision` | Controller's chosen action (`text` / `skill` / `done`) |
| `skill:selected` | A skill was picked; name + instruction |
| `text` | A single streamed token from TextNode |
| `tool` | A tool call started / finished (e.g. `generate_image`) |
| `image` | An image was saved to disk |
| `phase` | High-level phase label (_Thinking_, _Writing_, …) |
| `status` | Top-level lifecycle marker |
| `delta` | The handler's projected view for the editor: `{ token, fullContent }` |

The editor cares about `phase` and `delta`. The sidebar timeline can
surface the others for observability.

## Cancellation

Every task carries an `AbortController`. Cancelling from the UI:

1. Aborts the controller
2. Propagates through the active LLM call (which was created with
   `{ signal }`)
3. Removes the task from the queue if it hadn't started
4. Emits a `cancelled` event
5. Leaves any partial content that already reached the editor in place
   (or reverts, depending on the caller's policy — see
   `use-editor-stream-insert.ts`)

## Concurrency And Priority

Tasks are queued on a main-process **TaskExecutor** with:

- Priority: `high` / `normal` / `low`
- Concurrency cap: 10 (see `bootstrap.ts`)
- TTL retention: completed tasks are kept for 5 minutes so the renderer
  can re-query results after navigation

## When The Loop Stops

| Cause | Result |
| --- | --- |
| Controller picks `done` | `stoppedReason: 'done'` |
| Controller picks `text` / `skill` and TextNode finishes | `stoppedReason: 'done'` |
| `maxSteps` reached | `stoppedReason: 'max-steps'` |
| User cancels | task status `cancelled`, partial content retained |
| LLM call errors | task status `error`, partial content retained |

## Related Code

- `src/main/agents/writer/writer-agent.ts` — loop entry point
- `src/main/agents/writer/nodes/` — Intent / Controller / Text nodes
- `src/main/agents/core/agent.ts` — agent + event contract
- `src/main/task/handlers/agent-task-handler.ts` — bridge between task
  system and agents (enriches input, forwards events)
- `src/main/task/task-executor.ts` — priority queue, concurrency,
  lifecycle
