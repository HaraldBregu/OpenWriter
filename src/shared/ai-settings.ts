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
	{ name: 'Writer', description: 'Writes new text from a given prompt' },
	{ name: 'Painter', description: 'Generates images from a text prompt' },
];
