export type AssistantAgentId = 'writer' | 'painter' | 'image';

export interface AssistantAgentOption {
	value: AssistantAgentId;
	label: string;
}

export const ASSISTANT_AGENT_OPTIONS: readonly AssistantAgentOption[] = [
	{ value: 'writer', label: 'Writer' },
	{ value: 'painter', label: 'Painter' },
	{ value: 'image', label: 'Image' },
];
