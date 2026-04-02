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
  normalizedPrompt: '',
  intentFindings: '',
  needsRetrieval: false,
  needsImageGeneration: false,
  textFindings: '',
  ragFindings: '',
  imageFindings: '',
  phaseLabel: 'Classifying request...',
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
	normalizedPrompt: string;
	intentFindings: string;
	needsRetrieval: boolean;
	needsImageGeneration: boolean;
	textFindings: string;
	ragFindings: string;
	imageFindings: string;
	phaseLabel: string;
	response: string;
}
```

Field semantics:

- `prompt`: raw user input for the current turn
- `history`: prior conversation turns passed into the run
- `normalizedPrompt`: classifier-normalized version of the request
- `intentFindings`: internal routing note used by downstream workers
- `needsRetrieval`: whether the RAG branch should query workspace context
- `needsImageGeneration`: whether the image branch should prepare visual guidance
- `textFindings`: internal text draft generated before aggregation
- `ragFindings`: internal note generated from retrieved workspace context
- `imageFindings`: internal image note or no-op marker
- `phaseLabel`: current progress label surfaced to the UI
- `response`: final text emitted by the aggregator node

## Routing Schema

Routing contract:

```text
START
  -> intent_classification
  -> text_generation
  -> rag_query
  -> image_generation
  -> aggregate
  -> END
```

Execution detail:

```text
intent_classification runs first,
then text_generation, rag_query, and image_generation run in parallel,
then aggregate waits for all three and produces the final output.
```

## Node Model Schema

The assistant is configured as a per-node model map:

```ts
type AssistantNodeName =
	| 'intent_classification'
	| 'text_generation'
	| 'rag_query'
	| 'image_generation'
	| 'aggregate';

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
  intent_classification: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 512 },
  text_generation:       { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 2048 },
  rag_query:             { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  image_generation:      { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 768 },
  aggregate:             { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.5, maxTokens: 4096 }
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
  INTENT_CLASSIFICATION: 'Classifying request...',
  PARALLEL_WORKERS: 'Running assistant specialists...',
  AGGREGATE: 'Composing response...'
}
```
