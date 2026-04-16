# AI Agent Module

Isolated OpenAI-powered agent for the main process.

## Setup

```typescript
import { createAIClient, AIAgent } from './ai';

const client = createAIClient('sk-...');
const agent = new AIAgent(client, {
  model: 'gpt-4o',          // optional, default: gpt-4o
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,          // optional, default: 0.7
  maxCompletionTokens: 4096  // optional, default: 4096
});
```

## Chat (non-streaming)

```typescript
const response = await agent.chat([
  { role: 'user', content: 'Hello' }
]);

response.message.content;  // assistant reply
response.usage;             // token usage
response.finishReason;      // 'stop', 'tool_calls', etc.
```

## Streaming

```typescript
for await (const chunk of agent.streamChat([
  { role: 'user', content: 'Write a poem' }
])) {
  if (chunk.content) process.stdout.write(chunk.content);
  if (chunk.finishReason) break;
}
```

## Tool Calling

```typescript
const tools = [{
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: 'Get weather for a city',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
      additionalProperties: false
    }
  }
}];

const toolHandler = async (call) => {
  const args = JSON.parse(call.function.arguments);
  return JSON.stringify({ temp: '22°C', city: args.city });
};

// Agent auto-loops tool calls (max 10 iterations)
const response = await agent.chat(messages, { tools, toolHandler });
```

Without `toolHandler`, tool calls return in `response.message.tool_calls` for manual handling.

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `createAIClient(apiKey)` | function | Creates OpenAI client |
| `AIAgent` | class | Core agent with `chat()` and `streamChat()` |
| `AgentConfig` | type | Constructor config |
| `ChatOptions` | type | Per-call options (tools, temperature) |
| `ToolHandler` | type | `(toolCall) => Promise<string>` |
| `AgentResponse` | type | Chat return value |
| `StreamChunk` | type | Stream yield value |
