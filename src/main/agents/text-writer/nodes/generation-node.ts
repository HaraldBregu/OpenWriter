import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { streamChat } from '../llm-call';
import type { TextWriterAgentInput, TextWriterPath, TextWriterSkill } from '../types';

const BASE_SYSTEM_PROMPT = [
	'You are the text generator for a writing agent.',
	'Produce only the text that belongs in the document. No commentary, labels, or fences unless they belong in the document.',
].join(' ');

const STYLE_PROMPTS: Record<TextWriterPath, string> = {
	direct: 'Answer concisely. Match the length and depth of the request — short request → short answer.',
	skilled: 'Produce a focused, well-structured response. Use the active skill\'s guidance if provided.',
	exhaustive:
		'Produce a thorough, structured response. Cover the topic in depth with clear sections, examples, and reasoning where useful.',
};

export interface GenerationNodeOptions {
	perCallTimeoutMs: number;
}

export interface GenerationNodeRunInput {
	input: TextWriterAgentInput;
	instruction: string;
	path: TextWriterPath;
	skill?: TextWriterSkill;
}

export class GenerationNode {
	readonly name = 'generation' as const;

	constructor(private readonly opts: GenerationNodeOptions) {}

	async write(
		client: OpenAI,
		run: GenerationNodeRunInput,
		signal: AbortSignal,
		onDelta: (delta: string) => void
	): Promise<string> {
		const { input, instruction, path, skill } = run;
		const parts = [BASE_SYSTEM_PROMPT, STYLE_PROMPTS[path]];
		if (skill) parts.push(`Active skill: ${skill.name}\n${skill.instructions}`);
		const systemPrompt = parts.join('\n\n');
		const temperature = isReasoningModel(input.modelName) ? undefined : input.temperature;

		return streamChat({
			client,
			params: {
				model: input.modelName,
				messages: [
					{ role: 'system', content: systemPrompt },
					{
						role: 'user',
						content: `Original user request: ${input.prompt}\n\nInstruction: ${instruction}`,
					},
				],
				...(temperature !== undefined ? { temperature } : {}),
				...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
			},
			signal,
			timeoutMs: this.opts.perCallTimeoutMs,
			onDelta,
		});
	}
}
