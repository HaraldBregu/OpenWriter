// ---------------------------------------------------------------------------
// Stream events — canonical definition lives in src/shared/types.ts.
// Re-exported here so ai/core consumers can import from a single local path.
// ---------------------------------------------------------------------------

export type { AgentStreamEvent } from '../../../shared/types';

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
