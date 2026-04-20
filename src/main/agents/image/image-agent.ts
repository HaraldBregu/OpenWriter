import OpenAI from 'openai';
import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import type { ImageAgentInput, ImageAgentOutput, GeneratedImage } from './types';

const DEFAULT_COUNT = 1;
const DEFAULT_SIZE = '1024x1024';

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
};

/**
 * ImageAgent — generate images from a text prompt via OpenAI-compatible
 * `images.generate` endpoint.
 */
export class ImageAgent extends BaseAgent<ImageAgentInput, ImageAgentOutput> {
	readonly type = 'image';

	validate(input: ImageAgentInput): void {
		if (!input.prompt?.trim()) {
			throw new AgentValidationError(this.type, 'prompt required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
	}

	protected async run(input: ImageAgentInput, ctx: AgentContext): Promise<ImageAgentOutput> {
		const baseURL = PROVIDER_BASE_URLS[input.providerId];
		const client = new OpenAI({ apiKey: input.apiKey, ...(baseURL ? { baseURL } : {}) });

		this.reportProgress(ctx, 10, 'Requesting image generation');

		const response = await client.images.generate(
			{
				model: input.modelName,
				prompt: input.prompt,
				size: input.size ?? DEFAULT_SIZE,
				n: input.count ?? DEFAULT_COUNT,
				response_format: input.responseFormat ?? 'url',
			},
			ctx.signal ? { signal: ctx.signal } : undefined
		);

		this.ensureNotAborted(ctx.signal);
		this.reportProgress(ctx, 100, 'Image generation complete');

		const images: GeneratedImage[] = (response.data ?? []).map((item) => ({
			url: item.url,
			b64: item.b64_json,
		}));

		return { images, model: input.modelName };
	}
}
