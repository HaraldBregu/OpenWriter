// ---------------------------------------------------------------------------
// Shared AI Settings Types
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Agent configuration types
// ---------------------------------------------------------------------------

export interface AgentConfig {
	name: string;
	description: string;
}

export const DEFAULT_AGENTS: ReadonlyArray<AgentConfig> = [
	{ name: 'Text Completer', description: 'Completes and continues text from the provided context' },
	{ name: 'Text Enhance', description: 'Enhances and transforms text style and tone' },
	{ name: 'Text Writer', description: 'Writes new text from a given prompt' },
	{
		name: 'Image Generator',
		description: 'Generates images from a text prompt and returns the image URL',
	},
];
