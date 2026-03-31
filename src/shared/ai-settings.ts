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
	id: string;
	name: string;
	description: string;
}

export const DEFAULT_AGENTS: ReadonlyArray<AgentConfig> = [
	{
		id: 'assistant',
		name: 'Assistant',
		description: 'Routes requests by intent and responds through the right specialist flow',
	},
	{
		id: 'writer',
		name: 'Writer',
		description: 'Writes text from a prompt',
	},
	{
		id: 'researcher',
		name: 'Researcher',
		description: 'Finds, summarizes, and organizes information for your writing',
	},
	{
		id: 'text-writer',
		name: 'Narrator',
		description: 'Shapes scenes, voice, and storytelling flow for narrative writing',
	},
	{
		id: 'painter',
		name: 'Painter',
		description: 'Generates images from a text prompt',
	},
];
