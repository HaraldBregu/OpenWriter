import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { isReasoningModel } from '../../shared/ai-utils';
import type { AssistantAgentInput, AssistantAgentOutput } from './types';

const SYSTEM_PROMPT =
	'You are a writing assistant. Produce only the text that should appear in the document. No commentary, labels, or fences unless they belong in the document.';

export class AssistantAgent extends BaseAgent<AssistantAgentInput, AssistantAgentOutput> {
	readonly type = 'assistant';

	validate(input: AssistantAgentInput): void {
		if (!input.prompt?.trim()) throw new AgentValidationError(this.type, 'prompt required');
		if (!input.providerId?.trim()) throw new AgentValidationError(this.type, 'providerId required');
		if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
		if (!input.modelName?.trim()) throw new AgentValidationError(this.type, 'modelName required');
	}

	protected async run(
		input: AssistantAgentInput,
		ctx: AgentContext
	): Promise<AssistantAgentOutput> {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const temperature = isReasoningModel(input.modelName) ? undefined : input.temperature;

		const stream = await client.chat.completions.create(
			{
				model: input.modelName,
				stream: true,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: input.prompt },
				],
				...(temperature !== undefined ? { temperature } : {}),
				...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
			},
			{ signal: ctx.signal }
		);

		let content = '';
		for await (const chunk of stream) {
			if (ctx.signal.aborted) throw new DOMException('Aborted', 'AbortError');
			const delta = chunk.choices[0]?.delta?.content;
			if (!delta) continue;
			content += delta;
			ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } });
		}

		return { content, stoppedReason: 'done' };
	}
}
