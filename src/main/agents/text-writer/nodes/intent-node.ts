import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { callChat } from '../llm-call';
import { INTENT_SCHEMA, parseIntent } from '../schemas';
import type { TextWriterAgentInput, TextWriterIntentClassification } from '../types';

const SYSTEM_PROMPT = [
	'You classify the user intent for a text-writer agent.',
	'Pick exactly one intent and respond as JSON only.',
	'- compose: produce new text from a topic, outline, or description.',
	'- transform: rewrite, summarize, translate, or restructure existing text the user provided in the prompt.',
	'- answer: reply to a direct question.',
	'- other: anything else writing-related that does not fit above.',
].join(' ');

export interface IntentNodeOptions {
	perCallTimeoutMs: number;
}

export class IntentNode {
	readonly name = 'intent' as const;

	constructor(private readonly opts: IntentNodeOptions) {}

	async classify(
		client: OpenAI,
		input: TextWriterAgentInput,
		signal: AbortSignal
	): Promise<TextWriterIntentClassification> {
		const temperature = isReasoningModel(input.modelName) ? undefined : 0;
		const raw = await callChat({
			client,
			params: {
				model: input.modelName,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: input.prompt },
				],
				response_format: INTENT_SCHEMA,
				...(temperature !== undefined ? { temperature } : {}),
			},
			signal,
			timeoutMs: this.opts.perCallTimeoutMs,
		});
		return parseIntent(raw);
	}
}
