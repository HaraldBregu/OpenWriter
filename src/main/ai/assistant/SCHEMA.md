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
  route: 'text',
  intentFindings: '',
  needsRetrieval: false,
  needsWebSearch: false,
  needsImageGeneration: false,
  plannerFindings: '',
  ragQuery: '',
  webSearchQuery: '',
  textFindings: '',
  ragFindings: '',
  webFindings: '',
  analysisFindings: '',
  shouldRetry: false,
  reviewCount: 0,
  imagePrompt: '',
  imageFindings: '',
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
	route: 'text' | 'image';
	intentFindings: string;
	needsRetrieval: boolean;
	needsWebSearch: boolean;
	needsImageGeneration: boolean;
	plannerFindings: string;
	ragQuery: string;
	webSearchQuery: string;
	textFindings: string;
	ragFindings: string;
	webFindings: string;
	analysisFindings: string;
	shouldRetry: boolean;
	reviewCount: number;
	imagePrompt: string;
	imageFindings: string;
	phaseLabel: string;
	response: string;
}
```

Field semantics:

- `prompt`: raw user input for the current turn
- `history`: prior conversation turns passed into the run
- `normalizedPrompt`: intent-normalized version of the request
- `route`: primary branch chosen by the intent detector
- `intentFindings`: internal routing note used downstream
- `needsRetrieval`: whether the text branch should query workspace context
- `needsWebSearch`: whether the text branch should query DuckDuckGo
- `needsImageGeneration`: whether the image branch should run
- `plannerFindings`: internal execution brief for the text branch
- `ragQuery`: planner-produced workspace query
- `webSearchQuery`: planner-produced external search query
- `textFindings`: internal draft from the text generator
- `ragFindings`: internal note generated from retrieved workspace context
- `webFindings`: internal note generated from DuckDuckGo search results
- `analysisFindings`: analyzer verdict and retry guidance
- `shouldRetry`: whether the analyzer requested another pass
- `reviewCount`: number of completed analyzer passes
- `imagePrompt`: enhanced prompt for the image branch
- `imageFindings`: internal image-branch note
- `phaseLabel`: current progress label surfaced to the UI
- `response`: final text emitted by the enhancer or image generator

## Routing Schema

Routing contract:

```text
START
  -> intent_detector
  -> image_prompt_enhancer
  -> image_generator
  -> END

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
then either:

IMAGE route:
  image_prompt_enhancer -> image_generator -> END

TEXT route:
  planner runs first,
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
	| 'enhancer'
	| 'image_prompt_enhancer'
	| 'image_generator';

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
  intent_detector:        { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 512 },
  planner:                { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.2, maxTokens: 1024 },
  rag_agent:              { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  duckduckgo_search:      { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  text_generator:         { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 2048 },
  analyzer:               { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.1, maxTokens: 768 },
  enhancer:               { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.5, maxTokens: 4096 },
  image_prompt_enhancer:  { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 768 },
  image_generator:        { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 1024 }
}
```

## Streaming Schema

Only the final branch nodes stream user-facing tokens:

```ts
['enhancer', 'image_generator'];
```

The planner, analyzer, and intermediate specialist agents are intentionally excluded from
token streaming.

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
  ENHANCER: 'Polishing response...',
  IMAGE_PROMPT_ENHANCER: 'Enhancing image prompt...',
  IMAGE_GENERATOR: 'Preparing image generation response...'
}
```
