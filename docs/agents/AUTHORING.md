# Authoring A New Agent

End-to-end guide for adding a new agent to OpenWriter's catalog.

## When To Add An Agent

Add an agent when a capability:

- Has a **distinct responsibility** (one sentence to describe).
- Has a clear **input/output contract**.
- Benefits from the task system's cancellation + event streaming.
- Should be reachable by multiple callers (editor, extension,
  internal workflow).

If you just need to run one tool call inline, add a **tool** instead.
If you just need a slight variation of an existing agent, add a
**skill**.

## Skeleton

Every agent extends `BaseAgent<TInput, TOutput>`:

```ts
// src/main/agents/greeter/greeter-agent.ts

import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';

export interface GreeterAgentInput {
  name: string;
  providerId: string;
  apiKey: string;
  modelName: string;
}

export interface GreeterAgentOutput {
  content: string;
  stoppedReason: 'done';
}

export class GreeterAgent extends BaseAgent<GreeterAgentInput, GreeterAgentOutput> {
  readonly type = 'greeter';

  validate(input: GreeterAgentInput): void {
    if (!input.name?.trim()) throw new AgentValidationError(this.type, 'name required');
    if (!input.providerId?.trim()) throw new AgentValidationError(this.type, 'providerId required');
    if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
    if (!input.modelName?.trim()) throw new AgentValidationError(this.type, 'modelName required');
  }

  protected async run(
    input: GreeterAgentInput,
    ctx: AgentContext
  ): Promise<GreeterAgentOutput> {
    const content = `Hello, ${input.name}.`;
    ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: content } });
    return { content, stoppedReason: 'done' };
  }
}
```

Rules:

- `type` is the dispatch key. Must be unique in the registry.
- `validate` throws early — no API call happens until validation
  passes.
- `run` is your implementation. It must honor `ctx.signal` and emit
  events via `ctx.onEvent`.

## Register It

In `src/main/bootstrap.ts`:

```ts
import { GreeterAgent } from './agents/greeter/greeter-agent';

agentRegistry.register(new GreeterAgent());
```

That's it — the agent is now reachable as:

```ts
window.task.submit({
  type: 'agent',
  input: {
    agentType: 'greeter',
    input: { name: 'World' },
  },
});
```

`providerId` / `apiKey` / `modelName` are filled in by
`AgentTaskHandler.enrichInput` from the agent's settings.

## Folder Structure

Per-agent folder under `src/main/agents/`:

```
src/main/agents/greeter/
├── greeter-agent.ts      # the class
├── types.ts              # Input / Output shapes + any enums
├── nodes/                # (optional) sub-nodes if you use a loop
└── index.ts              # re-exports
```

Mirror this even for small agents — it keeps the codebase uniform and
makes later refactors cheap.

## Using The Provider Factories

You rarely instantiate `OpenAI` yourself. Use the shared factories:

- `createOpenAIClient(providerId, apiKey)` — generic OpenAI-compatible
  client.
- `createChatModel({ providerId, apiKey, modelName, streaming })` — a
  thin wrapper with `invoke` / `stream` methods.
- `createEmbeddingModel({ providerId, apiKey, model })` — embeddings.
- `callChat(...)` / `streamChat(...)` — helpers used by the Writer's
  nodes; they handle timeouts and extraction.

All live under `src/main/shared/`.

## Streaming Output

Emit tokens as `text` events; the handler turns each into a `delta`
the editor appends:

```ts
for await (const chunk of stream) {
  if (ctx.signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const delta = chunk.choices[0]?.delta?.content;
  if (!delta) continue;
  ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } });
}
```

## Progress

For phase-based agents (OCR, Transcription), call `ctx.progress`:

```ts
ctx.progress?.(10, 'Preparing');
ctx.progress?.(50, 'Calling provider');
ctx.progress?.(100, 'Done');
```

The task handler ramps progress from text events automatically for
streaming agents; don't double-report.

## Cancellation

Every blocking call must accept `ctx.signal`:

```ts
const stream = await client.chat.completions.create(params, { signal: ctx.signal });
```

Long CPU loops should check `ctx.signal.aborted` and throw on abort.

## Validate Hard, Fail Early

Use `AgentValidationError` for shape/input errors. The handler catches
it and fails the task before spending API credits. Do not silently
accept empty strings or default missing fields — users pay for retries.

## Skills

If your agent should let users inject custom workflows:

1. Accept a `skills?: Skill[]` field on its input.
2. In your controller (if any), render the catalog and pick one per
   iteration.
3. Fold the selected skill's `instructions` into the system prompt.

`AgentTaskHandler.enrichInput` populates the writer agent's skill list
automatically. For a new agent, add similar logic in `enrichInput` or
pass skills through from the caller.

## Tools

Agents can use tools via OpenAI function-calling:

```ts
import { createGenerateImageTool, toOpenAITools, executeToolCalls } from '../tools';

const imageTool = createGenerateImageTool({
  imagesRoot: workspaceImagesDir,
  providerId, apiKey, modelName: imageModelName,
  contentFilePath,
});

const tools = [imageTool];

const response = await client.chat.completions.create({
  model: input.modelName,
  messages,
  tools: toOpenAITools(tools),
});

const toolCalls = response.choices[0].message.tool_calls ?? [];
await executeToolCalls(tools, toolCalls, ctx.signal);
```

Tools carry their own path safety and mutation-queue — don't
re-implement that.

## Dedicated Task Handler (Rarely Needed)

Most agents reuse `AgentTaskHandler`. You need a custom handler when:

- The input shape diverges materially from the generic
  `{ agentType, input }` wrapping.
- You need pre/post processing outside the agent (e.g. transcription's
  file upload path).
- You want to convert agent output into a different task result type.

Look at `TranscriptionTaskHandler` for a worked example.

## Testing

Unit-test the agent in isolation with a fake client:

```ts
describe('GreeterAgent', () => {
  it('throws on empty name', async () => {
    const agent = new GreeterAgent();
    expect(() =>
      agent.validate({ name: '', providerId: 'openai', apiKey: 'k', modelName: 'm' } as any)
    ).toThrow();
  });

  it('emits a text event with the greeting', async () => {
    const events: AgentEvent[] = [];
    const ctx: AgentContext = {
      signal: new AbortController().signal,
      logger: fakeLogger(),
      onEvent: (event) => events.push(event),
    };
    const agent = new GreeterAgent();
    const out = await agent.execute(
      { name: 'World', providerId: 'openai', apiKey: 'x', modelName: 'm' },
      ctx
    );
    expect(out.content).toBe('Hello, World.');
    expect(events.some((e) => e.kind === 'text')).toBe(true);
  });
});
```

Put tests under `tests/unit/main/agents/`.

## Checklist Before Merging

- [ ] Agent class extends `BaseAgent` and has a unique `type`.
- [ ] `validate` throws on every missing or empty required field.
- [ ] `run` honors `ctx.signal` (passes it to every external call,
      checks it before long loops).
- [ ] Text output emits `text` events, phase updates use
      `ctx.progress`.
- [ ] Agent is registered in `bootstrap.ts`.
- [ ] Unit tests cover happy-path + validation errors + cancellation.
- [ ] Catalog docs updated: `AGENT_TYPES.md` + a per-agent doc under
      `docs/agents/`.

## Anti-Patterns

Avoid:

- An agent that also handles storage or IPC. Those are separate
  services; the agent does AI work.
- An agent that swallows errors to "keep going". Throw clearly — the
  task system records the failure.
- An agent with a loop but no `maxSteps`. Always cap your loop.
- An agent that hard-codes a provider. Use the factories.
- An agent with a giant single method. Split into nodes (see
  `writer/nodes/`).
