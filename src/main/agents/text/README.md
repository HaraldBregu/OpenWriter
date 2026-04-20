# TextAgent

Produces chat/completion output from a configured LLM provider (OpenAI-compatible). Streams tokens when a stream reporter is supplied on the `AgentContext`; otherwise returns the full content in one shot.

## Folder layout

```
text/
  text-agent.ts   # TextAgent class (extends BaseAgent)
  types.ts        # TextAgentInput / TextAgentOutput
  index.ts        # barrel exports
  README.md
```

## Input

```ts
interface TextAgentInput {
  messages: ChatMessage[];   // system/user/assistant turns
  providerId: string;        // 'openai' | 'anthropic'
  apiKey: string;
  modelName: string;         // e.g. 'gpt-4o-mini'
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;       // enables token streaming when ctx.stream is set
}
```

## Output

```ts
interface TextAgentOutput {
  content: string;        // full assembled completion
  tokensStreamed: number; // non-zero only when streaming was active
}
```

## Behavior

- `validate` rejects missing `messages`, `apiKey`, or `modelName`.
- When `input.streaming === true` **and** `ctx.stream` is provided, tokens are forwarded one-by-one through `ctx.stream(token)` and accumulated into `content`.
- Otherwise a single non-streaming `invoke` call returns the full content.
- `ctx.signal` is honored: abort stops streaming immediately and propagates an `AbortError`.
- Provider/network errors are normalized via `classifyError` + `toUserMessage`.

## Usage — non-streaming

```ts
import { TextAgent } from '@main/agents/text';
import type { AgentContext } from '@main/agents/core';

const agent = new TextAgent();

const output = await agent.execute(
  {
    providerId: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a concise assistant.' },
      { role: 'user', content: 'Summarize HTTP/2 in one sentence.' },
    ],
  },
  {
    signal: new AbortController().signal,
    logger,
  } satisfies AgentContext
);

console.log(output.content);
```

## Usage — streaming

```ts
import { TextAgent } from '@main/agents/text';

const agent = new TextAgent();
const controller = new AbortController();

const output = await agent.execute(
  {
    providerId: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    streaming: true,
    messages: [{ role: 'user', content: 'Write a haiku about TCP.' }],
  },
  {
    signal: controller.signal,
    logger,
    stream: (token) => process.stdout.write(token),
  }
);

console.log(`\nstreamed ${output.tokensStreamed} tokens`);
```

## Usage — via AgentRegistry

```ts
import { AgentRegistry, TextAgent } from '@main/agents';

const registry = new AgentRegistry();
registry.register(new TextAgent());

const agent = registry.get<TextAgentInput, TextAgentOutput>('text');
const result = await agent.execute(input, ctx);
```

## Cancellation

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 2_000);

await agent.execute(input, { signal: controller.signal, logger, stream });
// throws DOMException('Aborted', 'AbortError') when cancelled mid-stream
```

## Notes

- Reasoning models (`o1`, `o3`, ...) ignore `temperature` — handled by `chat-model-factory`.
- All providers go through OpenAI-compatible endpoints; only `baseURL` + `apiKey` change.
- Token counts are derived from streamed chunks, not provider usage fields.
