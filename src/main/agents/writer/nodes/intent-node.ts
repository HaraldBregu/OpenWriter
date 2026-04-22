import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { callChat } from '../llm-call';
import { INTENT_SCHEMA, parseIntent } from '../schemas';
import type { WriterAgentInput, WriterIntentClassification } from '../types';

const SYSTEM_PROMPT = [
	'You classify the user intent for a writing assistant.',
	'Pick exactly one intent and respond as JSON only.',
	'- write-new: start fresh content from a topic.',
	'- continue: extend existing text.',
	'- summarize: condense existing material.',
	'- rewrite: rephrase/restructure existing text.',
	'- answer: reply to a question in the document.',
	'- other: anything else writing-related.',
].join(' ');

export interface IntentNodeOptions {
	perCallTimeoutMs: number;
}

export class IntentNode {
	readonly name = 'intent' as const;

	constructor(private readonly opts: IntentNodeOptions) {}

	async classify(
		client: OpenAI,
		input: WriterAgentInput,
		signal: AbortSignal
	): Promise<WriterIntentClassification> {
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
