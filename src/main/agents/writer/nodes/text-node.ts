import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { streamChat } from '../llm-call';
import type { WriterAgentInput, WriterSkill } from '../types';

const BASE_SYSTEM_PROMPT = [
	'You are the text worker for a writing agent.',
	'Receive a focused instruction and produce text that will be streamed into the document.',
	'Produce only the text that belongs in the document. No commentary, labels, or fences unless they belong in the document.',
].join(' ');

export interface TextNodeOptions {
	perCallTimeoutMs: number;
}

export interface TextNodeRunInput {
	input: WriterAgentInput;
	instruction: string;
	skill?: WriterSkill;
}

export class TextNode {
	readonly name = 'text' as const;

	constructor(private readonly opts: TextNodeOptions) {}

	async write(
		client: OpenAI,
		run: TextNodeRunInput,
		signal: AbortSignal,
		onDelta: (delta: string) => void
	): Promise<string> {
		const { input, instruction, skill } = run;
		const systemPrompt = skill
			? `${BASE_SYSTEM_PROMPT}\n\nActive skill: ${skill.name}\n${skill.instructions}`
			: BASE_SYSTEM_PROMPT;
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
