# Writer Agent

The **Writer** is the default agent for every in-editor prompt. It is a
bounded controller loop — classify, decide, produce — rather than a
single streaming completion.

Source: `src/main/agents/writer/`.

## Contract

### Input

```ts
interface WriterAgentInput {
  prompt: string;
  providerId: string;
  apiKey: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  skills?: Skill[];           // catalog controller may pick from
  maxSteps?: number;          // default 3
  perCallTimeoutMs?: number;  // default 90_000
}
```

`providerId` / `apiKey` / `modelName` are resolved from Settings by
`AgentTaskHandler` unless explicitly passed.

### Output

```ts
interface WriterAgentOutput {
  content: string;
  intent: WriterIntent;
  steps: number;
  stoppedReason: 'done' | 'max-steps';
}

type WriterIntent =
  | 'write-new' | 'continue' | 'summarize' | 'rewrite' | 'answer' | 'other';
```

## The Loop

Three nodes in order. Source: `src/main/agents/writer/nodes/`.

```mermaid
flowchart LR
    Start([prompt])
    Intent[IntentNode]
    Controller[ControllerNode]
    Text[TextNode]
    Done([stoppedReason])

    Start --> Intent
    Intent --> Controller
    Controller -->|action: "text"| Text
    Controller -->|action: "skill"| Text
    Controller -->|action: "done"| Done
    Text -.-> Controller
```

### IntentNode

Classifies the user's request into exactly one intent. A one-shot call
that returns structured JSON matching the `INTENT_SCHEMA`.

System prompt (abridged):

> You classify the user intent for a writing assistant. Pick exactly one:
> `write-new`, `continue`, `summarize`, `rewrite`, `answer`, `other`.

Returns `{ intent, summary }`. Emits `{ kind: 'intent' }`.

### ControllerNode

Given the intent, the loop history, and the skill catalog, decides the
next action:

```ts
type WriterAction = 'text' | 'skill' | 'done';
interface WriterDecision {
  action: WriterAction;
  instruction: string | null;
  skillName: string | null;   // required when action === 'skill'
  reasoning: string | null;
}
```

Rules baked into the controller prompt:

- Pick `skill` **only** when a listed skill clearly matches. Picking a
  non-matching skill is worse than picking `text`.
- Never invent a `skillName` — it must be in the catalog.
- When the catalog is empty, `skill` is not available.

Emits `{ kind: 'decision' }`. If a skill is picked, also emits
`{ kind: 'skill:selected', payload: { skillName, instruction } }`.

### TextNode

Streams text from the chat model with a system prompt that folds the
selected skill in when one was chosen:

```
You are the text worker for a writing agent.
Receive a focused instruction and produce text that will be streamed
into the document. Produce only the text that belongs in the document.
No commentary, labels, or fences unless they belong in the document.

Active skill: <name>
<skill.instructions>
```

Each token is emitted as `{ kind: 'text', payload: { text: delta } }`.
The task handler converts every text delta into a `delta` event the
editor consumes, appending to the cursor position in real time.

## Default Step Budget

- `maxSteps` defaults to **3**.
- In practice the loop exits after one productive step (`text` or
  `skill`) or when the controller picks `done`.
- `maxSteps` is the safety ceiling, not a "please keep going" signal.

## Reasoning Models

For reasoning-class models (`o1`, `o3`, `o4-mini`, …) the nodes skip
unsupported parameters like `temperature` automatically — detected by
`isReasoningModel(modelId)` in `src/shared/models.ts`.

## Skills

The controller receives a rendered catalog of the current skill list:

```
Skill catalog:
  1. blog-post-outline — Draft a 5-section outline from a topic.
  2. tweet-thread — Break prose into a numbered thread.
  3. translate-to-it — Translate the selection to Italian.
```

When the controller picks one, `TextNode` injects
`skill.instructions` into the system prompt and uses the controller's
`instruction` field as the user message guidance.

Skills are registered in `SkillsStoreService`; see [SKILLS.md](./SKILLS.md).

## Tool Use (Images And More)

If the chat model supports function-calling and a tool like
`generate_image` is registered, the writer can call it mid-stream. The
tool:

1. Calls the image provider.
2. Writes the image to `<workspace>/images/<filename>.png`.
3. Appends a Markdown image reference to `content.md` at the cursor.

This is how the Writer produces images today. A dedicated **Painter**
agent is the planned refactor — see [PAINTER.md](./PAINTER.md).

## Events Emitted

During a normal run, in order:

```
intent        →  classification result
decision      →  first controller pick
skill:selected  →  (optional) if decision.action === 'skill'
text          →  token
text          →  token
text          →  token
... many text events ...
tool          →  (optional) if the model called a tool
image         →  (optional) if the tool produced an image
decision      →  subsequent controller pick (if looping continues)
```

The handler projects `text` events into `delta` events the editor
consumes.

## Cancellation

The handler passes `ctx.signal` into every LLM call via the OpenAI
SDK's `{ signal }` option. On cancel:

- The in-flight fetch is aborted.
- `streamChat` / `callChat` re-throws `AbortError`.
- The loop exits; whatever content already reached the editor is kept.

## Failure Modes

| Failure | Handling |
| --- | --- |
| Invalid JSON from IntentNode | Throws; task ends in `error`. |
| Controller picks unknown `skillName` | Fallback: treated as `action: 'text'`; warning logged. |
| Per-call timeout hits | The call throws; the task ends in `error`. Adjust `perCallTimeoutMs` on input if needed. |
| User cancels | Task ends in `cancelled`; partial content preserved. |

## Extending

The writer's three nodes are self-contained. You can:

- Add an `AnalyzerNode` between `TextNode` and the next controller
  pass to reflect on output quality before looping.
- Add a `RetrieverNode` before the controller to seed the prompt with
  retrieved chunks (see [RAG_AUGMENTATION.md](./RAG_AUGMENTATION.md)).
- Add a `CriticNode` that rates the produced text against success
  criteria.

Each node is just a small class with a single async method — `decide`,
`classify`, `write`, etc. They share the OpenAI client but otherwise
stay pure.
