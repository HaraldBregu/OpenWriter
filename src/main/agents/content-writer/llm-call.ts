import type OpenAI from 'openai';
import { isReasoningModel } from '../../shared/ai-utils';
import type {
	ContentWriterCallParams,
	ContentWriterLlmCaller,
	ContentWriterStreamParams,
} from './types';

export class OpenAIContentWriterLlmCaller implements ContentWriterLlmCaller {
	constructor(
		private readonly client: OpenAI,
		private readonly timeoutMs: number
	) {}

	async call(params: ContentWriterCallParams, signal: AbortSignal): Promise<string> {
		const merged = withTimeout(signal, this.timeoutMs);
		try {
			const response = await this.client.chat.completions.create(buildParams(params, false), {
				signal: merged.signal,
			});
			return response.choices[0]?.message?.content ?? '';
		} finally {
			merged.clear();
		}
	}

	async stream(params: ContentWriterStreamParams, signal: AbortSignal): Promise<string> {
		const merged = withTimeout(signal, this.timeoutMs);
		try {
			const stream = await this.client.chat.completions.create(
				{ ...buildParams(params, true), stream: true },
				{ signal: merged.signal }
			);
			let content = '';
			for await (const chunk of stream) {
				if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
				const delta = chunk.choices[0]?.delta?.content;
				if (!delta) continue;
				content += delta;
				params.onDelta(delta);
			}
			return content;
		} finally {
			merged.clear();
		}
	}
}

function buildParams(
	params: ContentWriterCallParams,
	streaming: boolean
): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
	const reasoning = isReasoningModel(params.modelName);
	const out: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
		model: params.modelName,
		messages: [
			{ role: 'system', content: params.systemPrompt },
			{ role: 'user', content: params.userPrompt },
		],
	};
	if (!reasoning && params.temperature !== undefined) out.temperature = params.temperature;
	if (params.maxTokens) out.max_tokens = params.maxTokens;
	if (params.jsonSchema && !streaming) {
		out.response_format = {
			type: 'json_schema',
			json_schema: {
				name: params.jsonSchema.name,
				strict: true,
				schema: params.jsonSchema.schema,
			},
		};
	}
	return out;
}

function withTimeout(
	signal: AbortSignal,
	timeoutMs: number
): { signal: AbortSignal; clear: () => void } {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = (): void => controller.abort(signal.reason);
	if (signal.aborted) controller.abort(signal.reason);
	else signal.addEventListener('abort', onAbort, { once: true });
	return {
		signal: controller.signal,
		clear: (): void => {
			clearTimeout(timer);
			signal.removeEventListener('abort', onAbort);
		},
	};
}
