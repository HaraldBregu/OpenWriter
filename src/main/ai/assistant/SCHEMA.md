# Assistant Agent Schema

## Identity

```ts
{
  id: 'assistant',
  name: 'Assistant',
  category: 'utility'
}
```

## Execution Mode

The assistant uses the custom-state LangGraph path, not the default
`{ messages }` protocol.

That means the agent defines:

- `buildGraph(models, retriever?)`
- `prepareGraph(baseBuildGraph, runtimeContext)`
- `buildGraphInput(ctx)`
- `extractGraphOutput(state)`
- `extractThinkingLabel(state)`

## Request Schema

External request shape accepted by the AI executor:

```ts
interface AgentRequest {
  prompt: string;
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  providerId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}
```

## Runtime Context Schema

Runtime context injected before graph construction:

```ts
interface AgentRuntimeContext {
  workspacePath?: string;
  apiKey: string;
  providerId: string;
}
```

If `workspacePath` is present, `prepareGraph(...)` wraps the graph with a
workspace-bound `RagRetriever`.

## Graph Input Schema

Executor-resolved context available to `buildGraphInput(ctx)`:

```ts
interface GraphInputContext {
  prompt: string;
  apiKey: string;
  modelName: string;
  providerId: string;
  temperature: number;
  metadata?: Record<string, unknown>;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

Initial graph state produced by the assistant:

```ts
{
  prompt: ctx.prompt,
  history: ctx.history,
  intent: 'conversation',
  phaseLabel: 'Understanding request...',
  response: ''
}
```

`ragContext` is not initialized explicitly here because it is supplied by the
state default and later populated by the `rag` node.

## Graph State Schema

Canonical assistant graph state:

```ts
interface AssistantGraphState {
  prompt: string;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  intent: AssistantIntent;
  phaseLabel: string;
  response: string;
  ragContext: string;
}
```

Field semantics:

- `prompt`: raw user input for the current turn
- `history`: prior conversation turns passed into the run
- `intent`: route selected by the `understand` node
- `phaseLabel`: current progress label surfaced to the UI
- `response`: final text emitted by the selected specialist node
- `ragContext`: concatenated retrieval context from the workspace vector store

## Route Enum Schema

```ts
type AssistantIntent =
  | 'conversation'
  | 'writing'
  | 'editing'
  | 'research'
  | 'image';
```

Routing contract:

```text
START
  -> rag
  -> understand
  -> one of conversation | writing | editing | research | image
  -> END
```

## Node Model Schema

The assistant is configured as a per-node model map:

```ts
type AssistantNodeName =
  | 'understand'
  | 'conversation'
  | 'writing'
  | 'editing'
  | 'research'
  | 'image';

interface NodeModelConfig {
  providerId: string;
  modelId: string;
  temperature: number;
  maxTokens?: number;
}

type AssistantNodeModels = Record<AssistantNodeName, NodeModelConfig>;
```

Current configured values:

```ts
{
  understand:   { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 64 },
  conversation: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 2048 },
  writing:      { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.8, maxTokens: 4096 },
  editing:      { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.5, maxTokens: 4096 },
  research:     { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 4096 },
  image:        { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 1024 }
}
```

## Streaming Schema

Only specialist nodes are streamable:

```ts
[
  'conversation',
  'writing',
  'editing',
  'research',
  'image'
]
```

The router and retrieval nodes are intentionally excluded from token streaming.

## Output Schema

Final output extraction:

```ts
extractGraphOutput(state): string
```

Returned value:

```ts
typeof state.response === 'string' ? state.response : ''
```

Thinking label extraction:

```ts
extractThinkingLabel(state): string | undefined
```

Returned value:

```ts
typeof state.phaseLabel === 'string' ? state.phaseLabel : undefined
```

## Phase Label Schema

Known labels emitted by the assistant:

```ts
{
  RAG: 'Searching documents...',
  UNDERSTAND: 'Understanding request...',
  CONVERSATION: 'Responding...',
  WRITING: 'Writing response...',
  EDITING: 'Editing response...',
  RESEARCH: 'Preparing researched response...',
  IMAGE: 'Preparing image response...'
}
```
