# Assistant Agent

The **Assistant** is the minimal agent — one streaming chat call with a
fixed writing system prompt. No loop, no intent classification, no
controller. It is meant for callers that want raw streaming text with
no ceremony.

Source: `src/main/agents/assistant/assistant-agent.ts`.

## Contract

### Input

```ts
interface AssistantAgentInput {
  prompt: string;
  providerId: string;
  apiKey: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
}
```

### Output

```ts
interface AssistantAgentOutput {
  content: string;
  stoppedReason: 'done';
}
```

## System Prompt

```
You are a writing assistant. Produce only the text that should appear
in the document. No commentary, labels, or fences unless they belong
in the document.
```

That single instruction keeps the output clean enough to drop straight
into the editor — no "Here is your text:" preambles.

## Execution

One streaming call via the OpenAI SDK:

```ts
const stream = await client.chat.completions.create(
  {
    model: input.modelName,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: input.prompt },
    ],
    ...(temperature !== undefined ? { temperature } : {}),
    ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
  },
  { signal: ctx.signal }
);
```

Each chunk's `delta.content` is emitted as a `text` event:

```ts
ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } });
```

## Reasoning Models

Reasoning-class models (`o1`, `o3`, `o4-mini`, …) skip `temperature`
automatically. Detected via `isReasoningModel(modelName)`.

## When To Use The Assistant Over The Writer

Reach for the Writer when:

- You want intent classification.
- You want skill selection.
- You want the controller loop's stopping rules.

Reach for the Assistant when:

- You already know what you want — "continue this paragraph in the
  same voice" — and just need streaming output.
- You are wiring an extension or automation that wants a thin, fast
  path.
- You want to avoid the couple of extra API calls the Writer's
  `IntentNode` and `ControllerNode` make.

## Events Emitted

Only `text` events (plus the task lifecycle events emitted by the
handler). The editor receives them as `delta` projections in the usual
way.

## Tool Use

The Assistant does **not** wire tools by default. It is intentionally a
one-shot completion path. If you need tool-calling, prefer the Writer
or register a new agent that does.

## Cancellation

`ctx.signal` is passed to the provider request. Aborting causes the
stream to throw `AbortError`; the task transitions to `cancelled`.

## Failure Modes

| Failure | Behavior |
| --- | --- |
| Invalid input (missing prompt / provider / model) | Throws at `validate`; no API call is made. |
| Provider returns an error | The streaming iterator throws; task ends in `error`. |
| Mid-stream cancellation | `AbortError` thrown; partial content is retained on the task. |

## Examples

### From An Extension

```ts
await ctx.host.tasks.submit({
  type: 'agent',
  input: {
    agentType: 'assistant',
    input: { prompt: 'Write a one-paragraph intro about airships.' },
  },
});
```

### From Inside The Main Process

```ts
const agent = container.get<AgentRegistry>('agentRegistry')
  .get<AssistantAgentInput, AssistantAgentOutput>('assistant');

const result = await agent.execute(
  { prompt, providerId, apiKey, modelName },
  { signal, logger, onEvent: console.log as AgentEventReporter },
);
```

## Summary

The Assistant is the smallest useful agent in the catalog: one call,
one prompt, one stream, one output. It is the right tool when the
context doesn't need classification or selection — and a good base to
copy when writing a new bespoke agent.
