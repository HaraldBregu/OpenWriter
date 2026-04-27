import type { ContentWriterAgentInput, ContentWriterLlmCaller } from '../types';

const SYSTEM_PROMPT = [
	'You write short, focused text for a content-writer agent.',
	'Keep the response tight: one or two sentences, or a single short paragraph at most.',
	'Output only the text that belongs in the document — no commentary, no labels, no fences.',
].join(' ');

export interface ShortTextNodeOptions {
	llmCaller: ContentWriterLlmCaller;
}

export class ShortTextNode {
	readonly name = 'short-text' as const;

	constructor(private readonly opts: ShortTextNodeOptions) {}

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
