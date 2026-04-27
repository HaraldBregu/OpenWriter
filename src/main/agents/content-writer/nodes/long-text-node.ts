import type { ContentWriterAgentInput, ContentWriterLlmCaller } from '../types';

const SYSTEM_PROMPT = [
	'You write long-form, structured text for a content-writer agent.',
	'Produce a thorough, well-organised response with clear paragraphs and, where useful, headings or bullets.',
	'Cover the topic in depth and stay on the user\'s requested subject.',
	'Output only the text that belongs in the document — no commentary, no labels, no fences.',
].join(' ');

export interface LongTextNodeOptions {
	llmCaller: ContentWriterLlmCaller;
}

export class LongTextNode {
	readonly name = 'long-text' as const;

	constructor(private readonly opts: LongTextNodeOptions) {}

	async write(
		input: ContentWriterAgentInput,
		signal: AbortSignal,
		onDelta: (delta: string) => void
	): Promise<string> {
		return this.opts.llmCaller.stream(
			{
				modelName: input.modelName,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt: input.prompt,
				temperature: input.temperature,
				maxTokens: input.maxTokens,
				onDelta,
			},
			signal
		);
	}
}
