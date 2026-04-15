export type ContentGeneratorAgentId = 'text' | 'image';

export interface ContentGeneratorAgentOption {
	value: ContentGeneratorAgentId;
	labelKey: string;
	labelFallback: string;
	descriptionKey: string;
	descriptionFallback: string;
}

export const CONTENT_GENERATOR_AGENT_OPTIONS: readonly ContentGeneratorAgentOption[] = [
	{
		value: 'text',
		labelKey: 'assistantAgent.text',
		labelFallback: 'Text',
		descriptionKey: 'assistantAgent.textDescription',
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
