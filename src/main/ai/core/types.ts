// ---------------------------------------------------------------------------
// History message (inlined from former AIAgentsSession)
// ---------------------------------------------------------------------------

export interface AgentHistoryMessage {
	role: 'user' | 'assistant';
	content: string;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface AgentRequest {
	/** User prompt text */
	prompt: string;
	/** Optional conversation history override (bypasses session history) */
	messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
	/** Override provider for this request only */
	providerId?: string;
	/** Override model for this request only */
	modelId?: string;
	/** Override temperature for this request only */
	temperature?: number;
	/** Override maxTokens for this request only */
	maxTokens?: number;
}

// ---------------------------------------------------------------------------
// Stream events
// ---------------------------------------------------------------------------

export type AgentStreamEvent =
	| { type: 'token'; token: string; runId: string }
	| { type: 'thinking'; content: string; runId: string }
	| { type: 'done'; content: string; tokenCount: number; runId: string }
	| { type: 'error'; error: string; code: string; runId: string };
