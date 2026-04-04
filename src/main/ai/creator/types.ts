export const CREATOR_ROUTER_AGENT_ID = 'router-agent' as const;

export type CreatorIntent =
	| 'create'
	| 'edit'
	| 'brainstorm'
	| 'research'
	| 'summarize'
	| 'translate'
	| 'chat'
	| 'unknown';

export type CreatorAgentId =
	| typeof CREATOR_ROUTER_AGENT_ID
	| 'writer-agent'
	| 'editor-agent'
	| 'brainstorm-agent'
	| 'research-agent'
	| 'summarizer-agent'
	| 'translator-agent'
	| 'conversation-agent';

export interface CreatorMessage {
	readonly role: 'system' | 'user' | 'assistant';
	readonly content: string;
}

export interface CreatorRequest {
	readonly prompt: string;
	readonly history?: CreatorMessage[];
	readonly metadata?: Record<string, unknown>;
}

export interface CreatorIntentCandidate {
	readonly intent: CreatorIntent;
	readonly suggestedAgentId: CreatorAgentId;
	readonly score: number;
	readonly confidence: number;
	readonly matchedSignals: string[];
}

export interface CreatorRouteDecision {
	readonly primaryIntent: CreatorIntent;
	readonly suggestedAgentId: CreatorAgentId;
	readonly normalizedPrompt: string;
	readonly confidence: number;
	readonly shouldClarify: boolean;
	readonly rationale: string;
	readonly candidates: CreatorIntentCandidate[];
}

export interface CreatorAgent<Input, Output> {
	readonly id: CreatorAgentId;
	readonly name: string;
	run(input: Input): Promise<Output>;
}
