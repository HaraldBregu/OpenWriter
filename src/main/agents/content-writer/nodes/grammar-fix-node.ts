import type { ContentWriterAgentInput, ContentWriterLlmCaller } from '../types';

const SYSTEM_PROMPT = [
	'You are a careful proofreader for a content-writer agent.',
	'Correct grammar, spelling, punctuation, and minor style issues in the user-provided text.',
	'Preserve the original meaning, tone, and structure. Do not add new ideas.',
	'Return only the corrected text — no commentary, no labels, no fences.',
].join(' ');

export interface GrammarFixNodeOptions {
	llmCaller: ContentWriterLlmCaller;
}

export class GrammarFixNode {
	readonly name = 'grammar-fix' as const;

	constructor(private readonly opts: GrammarFixNodeOptions) {}

	async write(
		input: ContentWriterAgentInput,
		signal: AbortSignal,
		onDelta: (delta: string) => void
	): Promise<string> {
		const userPrompt = buildUserPrompt(input);
		return this.opts.llmCaller.stream(
			{
				modelName: input.modelName,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt,
				temperature: input.temperature,
				maxTokens: input.maxTokens,
				onDelta,
			},
			signal
		);
	}
}

function buildUserPrompt(input: ContentWriterAgentInput): string {
	const target = input.existingText?.trim();
	if (target) {
		return [
			`User instruction: ${input.prompt}`,
			'',
			'Text to correct:',
			target,
		].join('\n');
	}
	return input.prompt;
}
