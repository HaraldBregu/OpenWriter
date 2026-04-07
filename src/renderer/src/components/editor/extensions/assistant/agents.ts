export type AssistantAgentId = 'writer' | 'image';

export interface AssistantAgentOption {
	value: AssistantAgentId;
	label: string;
}

export const ASSISTANT_AGENT_OPTIONS: readonly AssistantAgentOption[] = [
	{ value: 'writer', label: 'Writer' },
	{ value: 'image', label: 'Image' },
];
