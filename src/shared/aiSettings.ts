// ---------------------------------------------------------------------------
// Shared AI Settings Types
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

/**
 * Runtime inference settings object.
 * Passed to AI agents, stored in section configs, and snapshotted into
 * conversation metadata. Does NOT include apiToken.
 */
export interface InferenceSettings {
	providerId: string;
	modelId: string;
	temperature: number;
	maxTokens: number | null;
	reasoning: boolean;
}

/**
 * Hard-coded application-level defaults.
 * Used when no persisted value exists at any tier (store, section config).
 */
export const DEFAULT_INFERENCE_SETTINGS: InferenceSettings = {
	providerId: 'openai',
	modelId: 'gpt-4o',
	temperature: 0.7,
	maxTokens: 2048,
	reasoning: false,
};

// ---------------------------------------------------------------------------
// Agent configuration types
// ---------------------------------------------------------------------------

/**
 * Persisted configuration for a named AI agent.
 * Stored under `agentSettings[agentId]` in the electron-store.
 */
export interface AgentConfig {
	providerId: string;
	modelId: string;
	temperature: number;
	reasoning: boolean;
}

export const AGENT_IDS = ['text-completer', 'text-enhance', 'text-writer'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_DEFINITIONS: Record<AgentId, { name: string; description: string }> = {
	'text-completer': {
		name: 'Text Completer',
		description: 'Completes and continues text from the provided context',
	},
	'text-enhance': {
		name: 'Text Enhance',
		description: 'Enhances and transforms text style and tone',
	},
	'text-writer': {
		name: 'Text Writer',
		description: 'Writes new text from a given prompt',
	},
};

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
	providerId: 'openai',
	modelId: 'gpt-4o',
	temperature: 0.7,
	reasoning: false,
};
