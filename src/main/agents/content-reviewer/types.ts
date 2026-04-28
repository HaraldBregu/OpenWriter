/**
 * Types for the ContentReviewerAgent.
 *
 * The agent is intentionally minimal: a single streaming LLM call. The
 * response shape is whatever the model produces — there is no routing,
 * no schema-constrained output, no per-route variants.
 */

export interface ContentReviewerAgentInput {
	prompt: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
	/** Per-LLM-call timeout in ms. Default 90_000. */
	perCallTimeoutMs?: number;
}

export interface ContentReviewerAgentOutput {
	content: string;
}

export interface ContentReviewerStreamParams {
	modelName: string;
	systemPrompt: string;
	userPrompt: string;
	temperature?: number;
	maxTokens?: number;
	onDelta: (delta: string) => void;
}

/**
 * Streaming LLM surface used by the agent. Production builds a real
 * implementation backed by OpenAI; tests inject a fake.
 */
export interface ContentReviewerLlmCaller {
	stream(params: ContentReviewerStreamParams, signal: AbortSignal): Promise<string>;
}
