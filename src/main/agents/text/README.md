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
  streaming?: boolean;       // enables token streaming (plain mode only)
  tools?: AgentTool[];       // when set → tool-loop mode
  maxIterations?: number;    // tool-loop cap (default: 10)
  toolSystemPrompt?: string; // prepended if messages[0] is not a system turn
}
```

## Output

```ts
interface TextAgentOutput {
  content: string;                 // final assistant text
  tokensStreamed: number;          // non-zero only in plain streaming mode
  toolCalls?: ToolCallRecord[];    // every tool invocation in order
  iterations?: number;             // LLM round trips (≥1)
}

interface ToolCallRecord {
  name: string;
  argumentsRaw: string;            // JSON string the model emitted
  output: string;                  // stringified tool output
  error?: string;                  // 'unknown_tool' | 'parse_error' | 'execution_error'
}
```

## Behavior

- `validate` rejects missing `messages`, `apiKey`, or `modelName`, and non-positive `maxIterations`.
- Plain mode (`tools` absent/empty):
  - Streaming on: tokens forwarded via `ctx.stream(token)`.
  - Streaming off: single `invoke` → full content.
- Tool-loop mode (`tools` non-empty):
  - Uses OpenAI Chat Completions `tools` + `tool_calls` directly.
  - Parallel tool calls in one turn are executed together (parallel by default; serialised if any tool in the batch declares `executionMode: 'sequential'`).
  - Tool outputs are fed back as `role: 'tool'` messages and the loop repeats until the assistant returns no `tool_calls`.
  - Hard cap: `maxIterations` (default 10). Exceeding it throws.
  - Streaming is disabled in this mode (the final content is returned whole).
- `ctx.signal` aborts the whole run (LLM call + in-flight tool).
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

## Usage — tool calling

```ts
import { TextAgent } from '@main/agents/text';
import { createReadOnlyTools } from '@main/agents/tools';

const agent = new TextAgent();

const output = await agent.execute(
  {
    providerId: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    tools: createReadOnlyTools(process.cwd()),
    maxIterations: 8,
    toolSystemPrompt:
      'You are a code navigator. Use tools to explore the repo before answering.',
    messages: [
      { role: 'user', content: 'Find every file that imports chat-model-factory.' },
    ],
  },
  { signal: controller.signal, logger }
);

console.log(output.content);
for (const call of output.toolCalls ?? []) {
  console.log(`[${call.name}]`, call.argumentsRaw, '→', call.output.slice(0, 200));
}
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
