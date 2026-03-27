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
	{
		name: 'Writer',
		description: 'Writes, continues, and enhances text from a prompt or existing draft',
	},
	{
		name: 'Researcher',
		description: 'Finds, summarizes, and organizes information for your writing',
	},
	{ name: 'Painter', description: 'Generates images from a text prompt' },
];
