import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createChatModel } from '../../shared/chat-model-factory';
import { classifyError, toUserMessage } from '../../shared/ai-utils';
import type { TextAgentInput, TextAgentOutput } from './types';

/**
 * TextAgent — produce chat/completion output from a configured LLM.
 *
 * Streams tokens when ctx.stream is provided; otherwise calls invoke once.
 */
export class TextAgent extends BaseAgent<TextAgentInput, TextAgentOutput> {
	readonly type = 'text';

	validate(input: TextAgentInput): void {
		if (!input.messages?.length) {
			throw new AgentValidationError(this.type, 'messages required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
	}

	protected async run(input: TextAgentInput, ctx: AgentContext): Promise<TextAgentOutput> {
		const model = createChatModel({
			providerId: input.providerId,
			apiKey: input.apiKey,
			modelName: input.modelName,
			streaming: Boolean(input.streaming),
			temperature: input.temperature,
			maxTokens: input.maxTokens,
		});

		try {
			if (input.streaming && ctx.stream) {
				return await this.runStreaming(model, input, ctx);
			}
			const content = await model.invoke(input.messages, ctx.signal);
			return { content, tokensStreamed: 0 };
		} catch (error) {
			const kind = classifyError(error);
			if (kind === 'abort') throw error;
			const raw = error instanceof Error ? error.message : String(error);
			throw new Error(toUserMessage(kind, raw));
		}
	}

	private async runStreaming(
		model: ReturnType<typeof createChatModel>,
		input: TextAgentInput,
		ctx: AgentContext
	): Promise<TextAgentOutput> {
		let content = '';
		let tokens = 0;
		for await (const token of model.stream(input.messages, ctx.signal)) {
			this.ensureNotAborted(ctx.signal);
			content += token;
			tokens += 1;
			ctx.stream?.(token);
		}
		return { content, tokensStreamed: tokens };
	}
}
