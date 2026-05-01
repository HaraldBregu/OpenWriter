import type { AgentModelRole } from './types';

export interface AgentDefinition {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly role: AgentModelRole;
}

export const AGENT_DEFINITIONS: readonly AgentDefinition[] = [
	{
		id: 'content-reviewer',
		name: 'Content Reviewer',
		description: 'Reviews drafts for clarity, tone, and structural issues before publishing.',
		role: 'text',
	},
	{
		id: 'content-writer',
		name: 'Content Writer',
		description: 'Drafts long-form articles, posts, and structured documents from a prompt.',
		role: 'text',
	},
	{
		id: 'image-creator',
		name: 'Image Creator',
		description: 'Generates illustrations, hero images, and graphics from a text prompt.',
		role: 'image',
	},
	{
		id: 'assistant',
		name: 'Personal Assistant',
		description: 'Answers questions, summarises selections, and assists while you write.',
		role: 'text',
	},
];
