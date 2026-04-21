import { createOpenAIClient } from '../../../shared/chat-model-factory';
import { isReasoningModel } from '../../../shared/ai-utils';
import type { AssistantNode, NodeContext, Order } from './node';
import { extractJsonObject } from './node';

const PLAN_TEMPERATURE = 0;

const SYSTEM_PROMPT = [
	'You decide execution order for a document assistant that must produce both text and an image.',
	'Respond with strict JSON of the form {"order":"image_first"|"text_first"}.',
	'Choose "image_first" when the document text will reference, describe, or build on the image.',
	'Choose "text_first" otherwise.',
	'Do not include any prose outside the JSON.',
].join(' ');

export class PlannerNode implements AssistantNode {
	readonly name = 'planner' as const;

	async run(ctx: NodeContext): Promise<void> {
		const { input, agentCtx, emit, state } = ctx;
		emit({ node: this.name, status: 'running' });

		if (state.intent !== 'both') {
			state.order = state.intent === 'image' ? 'image_first' : 'text_first';
			emit({
				node: this.name,
				status: 'skipped',
				data: { reason: 'single intent', order: state.order },
			});
			return;
		}

		const client = createOpenAIClient(input.providerId, input.apiKey);
		const temperature = isReasoningModel(input.modelName) ? undefined : PLAN_TEMPERATURE;

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
		state.order = parseOrder(raw);
		emit({ node: this.name, status: 'done', data: { order: state.order } });
	}
}

function parseOrder(raw: string): Order {
	try {
		const parsed = extractJsonObject(raw);
		const value = parsed.order;
		if (value === 'image_first' || value === 'text_first') {
			return value;
		}
	} catch {
		// fall through to default
	}
	return 'image_first';
}
