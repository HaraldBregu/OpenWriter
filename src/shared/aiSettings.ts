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
