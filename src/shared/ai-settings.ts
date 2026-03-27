// ---------------------------------------------------------------------------
// Shared AI Settings Types
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Agent configuration types
// ---------------------------------------------------------------------------

/**
 * Persisted configuration for a named AI agent (without identity).
 * Used as the value type when setting config for a known agent ID.
 */
export interface AgentConfig {
	name: string;
	providerId: string;
}

/**
 * A single agent entry stored in the workspace metadata file.
 * Each object in the `agents` array carries its own `agentId`.
 */
export interface WorkspaceAgentEntry extends AgentConfig {
	agentId: string;
}

export const AGENT_IDS = [
	'text-completer',
	'text-enhance',
	'text-writer',
	'image-generator',
] as const;
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
	'image-generator': {
		name: 'Image Generator',
		description: 'Generates images from a text prompt and returns the image URL',
	},
};

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
	name: '',
	providerId: 'openai',
};
