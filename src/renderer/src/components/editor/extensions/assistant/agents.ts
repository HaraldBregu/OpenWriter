export type AssistantAgentId = 'writer' | 'image';

export interface AssistantAgentOption {
	value: AssistantAgentId;
	labelKey: string;
	labelFallback: string;
	descriptionKey: string;
	descriptionFallback: string;
}

export const ASSISTANT_AGENT_OPTIONS: readonly AssistantAgentOption[] = [
	{
		value: 'writer',
		labelKey: 'assistantAgent.writer',
		labelFallback: 'Writer',
		descriptionKey: 'assistantAgent.writerDescription',
		descriptionFallback: 'Generate, rewrite, or continue text',
	},
	{
		value: 'image',
		labelKey: 'assistantAgent.image',
		labelFallback: 'Image',
		descriptionKey: 'assistantAgent.imageDescription',
		descriptionFallback: 'Create images from a prompt',
	},
];
