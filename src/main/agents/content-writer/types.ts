/**
 * Types for the ContentWriterAgent.
 *
 * Kept fully isolated to this folder — no leaks, no shared aliases. Other
 * agents in the registry have their own self-contained type modules.
 */

export type ContentWriterRoute = 'short' | 'grammar' | 'long';

export interface ContentWriterRouting {
	route: ContentWriterRoute;
	reasoning: string;
}

export type ContentWriterPhase = 'idle' | 'routing' | 'generating' | 'completed';

export interface ContentWriterState {
	phase: ContentWriterPhase;
	route: ContentWriterRoute | null;
}

export interface ContentWriterAgentInput {
	prompt: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
	/** Existing text supplied by the user — required only for grammar fixes. */
	existingText?: string;
	/** Per-LLM-call timeout in ms. Default 90_000. */
	perCallTimeoutMs?: number;
}

export interface ContentWriterAgentOutput {
	content: string;
	route: ContentWriterRoute;
	routing: ContentWriterRouting;
	state: ContentWriterState;
	stoppedReason: 'done';
}

/**
 * Provider-agnostic LLM-call surface used by the agent's nodes. Production
 * builds a real implementation backed by OpenAI; tests inject a fake.
 */
export interface ContentWriterCallParams {
	modelName: string;
	systemPrompt: string;
	userPrompt: string;
	temperature?: number;
	maxTokens?: number;
	/** When set, the caller asks the model for a strict JSON response. */
	jsonSchema?: ContentWriterJsonSchema;
}

export interface ContentWriterStreamParams extends ContentWriterCallParams {
	onDelta: (delta: string) => void;
}

export interface ContentWriterJsonSchema {
	name: string;
	schema: Record<string, unknown>;
}

export interface ContentWriterLlmCaller {
	call(params: ContentWriterCallParams, signal: AbortSignal): Promise<string>;
	stream(params: ContentWriterStreamParams, signal: AbortSignal): Promise<string>;
}
