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
  needsWebSearch: false,
  plannerFindings: '',
  ragQuery: '',
  webSearchQuery: '',
  textFindings: '',
  ragFindings: '',
  webFindings: '',
  analysisFindings: '',
  shouldRetry: false,
  reviewCount: 0,
  phaseLabel: 'Detecting intent...',
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
	needsWebSearch: boolean;
	plannerFindings: string;
	ragQuery: string;
	webSearchQuery: string;
	textFindings: string;
	ragFindings: string;
	webFindings: string;
	analysisFindings: string;
	shouldRetry: boolean;
	reviewCount: number;
	phaseLabel: string;
	response: string;
}
```

Field semantics:

- `prompt`: raw user input for the current turn
- `history`: prior conversation turns passed into the run
- `normalizedPrompt`: intent-normalized version of the request
- `intentFindings`: internal routing note used downstream
- `needsRetrieval`: whether the assistant should query workspace context
- `needsWebSearch`: whether the assistant should query DuckDuckGo
- `plannerFindings`: internal execution brief
- `ragQuery`: planner-produced workspace query
- `webSearchQuery`: planner-produced external search query
- `textFindings`: internal draft from the text generator
- `ragFindings`: internal note generated from retrieved workspace context
- `webFindings`: internal note generated from DuckDuckGo search results
- `analysisFindings`: analyzer verdict and retry guidance
- `shouldRetry`: whether the analyzer requested another pass
- `reviewCount`: number of completed analyzer passes
- `phaseLabel`: current progress label surfaced to the UI
- `response`: final text emitted by the enhancer

## Routing Schema

Routing contract:

```text
START
  -> intent_detector
  -> planner
  -> rag_agent
  -> duckduckgo_search
  -> text_generator
  -> analyzer
  -> planner | enhancer
  -> END
```

Execution detail:

```text
intent_detector runs first,
planner runs next,
rag_agent, duckduckgo_search, and text_generator run in parallel,
analyzer reviews all three outputs,
analyzer either retries planner or continues to enhancer,
enhancer produces the final response.
```

The analyzer retry budget is bounded in `graph.ts`.

## Specialist Model Schema

The assistant is configured as a per-specialist model map:

```ts
type AssistantSpecialistName =
	| 'intent_detector'
	| 'planner'
	| 'rag_agent'
	| 'duckduckgo_search'
	| 'text_generator'
	| 'analyzer'
	| 'enhancer';

interface NodeModelConfig {
	providerId: string;
	modelId: string;
	temperature: number;
	maxTokens?: number;
}

type AssistantSpecialistModels = Record<AssistantSpecialistName, NodeModelConfig>;
```

Current configured values:

```ts
{
  intent_detector:   { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 512 },
  planner:           { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.2, maxTokens: 1024 },
  rag_agent:         { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  duckduckgo_search: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  text_generator:    { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 2048 },
  analyzer:          { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  enhancer:          { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.5, maxTokens: 4096 }
}
```

## Streaming Schema

Only the enhancer streams user-facing tokens:

```ts
['enhancer'];
```

The planner, analyzer, and intermediate specialist agents are intentionally
excluded from token streaming.

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
  INTENT_DETECTOR: 'Detecting intent...',
  PLANNER: 'Planning response...',
  PARALLEL_SPECIALISTS: 'Running specialist agents...',
  ANALYZER: 'Reviewing specialist outputs...',
  ENHANCER: 'Polishing response...'
}
```
