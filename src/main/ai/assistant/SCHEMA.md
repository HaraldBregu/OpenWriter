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
  ragFindings: '',
  grammarFindings: '',
  phaseLabel: 'Running assistant checks...',
  response: ''
}
```

## Graph State Schema

Canonical assistant graph state:

```ts
interface AssistantGraphState {
	prompt: string;
	history: Array<{
		role: 'user' | 'assistant';
		content: string;
	}>;
	ragFindings: string;
	grammarFindings: string;
	phaseLabel: string;
	response: string;
}
```

Field semantics:

- `prompt`: raw user input for the current turn
- `history`: prior conversation turns passed into the run
- `ragFindings`: internal note generated from retrieved workspace context
- `grammarFindings`: internal note generated from grammar and clarity review
- `phaseLabel`: current progress label surfaced to the UI
- `response`: final text emitted by the aggregator node

## Routing Schema

Routing contract:

```text
START
  -> rag_query
  -> grammar_check
  -> aggregate
  -> END
```

Execution detail:

```text
rag_query and grammar_check run in parallel,
then aggregate waits for both and produces the final output.
```

## Node Model Schema

The assistant is configured as a per-node model map:

```ts
type AssistantNodeName = 'rag_query' | 'grammar_check' | 'aggregate';

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
  rag_query:     { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  grammar_check: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 512 },
  aggregate:     { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.6, maxTokens: 4096 }
}
```

## Streaming Schema

Only the aggregator node is streamable:

```ts
['aggregate'];
```

The worker nodes are intentionally excluded from token streaming.

## Output Schema

Final output extraction:

```ts
extractGraphOutput(state): string
```

Returned value:

```ts
typeof state.response === 'string' ? state.response : '';
```

Thinking label extraction:

```ts
extractThinkingLabel(state): string | undefined
```

Returned value:

```ts
typeof state.phaseLabel === 'string' ? state.phaseLabel : undefined;
```

## Phase Label Schema

Known labels emitted by the assistant:

```ts
{
  PARALLEL_CHECKS: 'Running assistant checks...',
  AGGREGATE: 'Composing response...'
}
```
