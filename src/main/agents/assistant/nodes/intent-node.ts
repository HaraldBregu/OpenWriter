import { createOpenAIClient } from '../../../shared/chat-model-factory';
import { isReasoningModel } from '../../../shared/ai-utils';
import type { AssistantNode, NodeContext, Intent } from './node';
import { extractJsonObject } from './node';

const CLASSIFY_TEMPERATURE = 0;

const SYSTEM_PROMPT = [
	'You classify a user request for a document assistant.',
	'Respond with strict JSON of the form {"intent":"image"|"text"|"both"|"none"}.',
	'Use "image" only when the user explicitly asks to generate or create an image and nothing else.',
	'Use "text" when the user asks for writing, editing, or analysing document text.',
	'Use "both" when the user asks for text AND an image to be generated.',
	'Use "none" only when the request is unrelated to either.',
	'Do not include any prose outside the JSON.',
].join(' ');

export class IntentNode implements AssistantNode {
	readonly name = 'intent' as const;

	async run(ctx: NodeContext): Promise<void> {
		const { input, agentCtx, emit, state } = ctx;
		emit({ node: this.name, status: 'running' });

		const client = createOpenAIClient(input.providerId, input.apiKey);
		const temperature = isReasoningModel(input.modelName) ? undefined : CLASSIFY_TEMPERATURE;

		const response = await client.chat.completions.create(
			{
				model: input.modelName,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: input.prompt },
				],
				...(temperature !== undefined ? { temperature } : {}),
			},
			agentCtx.signal ? { signal: agentCtx.signal } : undefined
		);

		const raw = response.choices[0]?.message?.content ?? '';
		const intent = parseIntent(raw);
		state.intent = intent;
		emit({ node: this.name, status: 'done', data: { intent } });
	}
}

function parseIntent(raw: string): Intent {
	try {
		const parsed = extractJsonObject(raw);
		const value = parsed.intent;
		if (value === 'image' || value === 'text' || value === 'both' || value === 'none') {
			return value;
		}
	} catch {
		// fall through to default
	}
	return 'text';
}
