import OpenAI from 'openai';
import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import type { OcrAgentInput, OcrAgentOutput, OcrPage } from './types';

const DEFAULT_PROMPT =
	'Extract all readable text from this image or document. Preserve line breaks and formatting.';

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
	anthropic: 'https://api.anthropic.com/v1/',
};

/**
 * OcrAgent — extract text from images/documents via a vision-capable LLM.
 *
 * Uses the OpenAI-compatible chat/completions endpoint with an image_url
 * content block.
 */
export class OcrAgent extends BaseAgent<OcrAgentInput, OcrAgentOutput> {
	readonly type = 'ocr';

	validate(input: OcrAgentInput): void {
		if (!input.source?.trim()) {
			throw new AgentValidationError(this.type, 'source required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
	}

	protected async run(input: OcrAgentInput, ctx: AgentContext): Promise<OcrAgentOutput> {
		const baseURL = PROVIDER_BASE_URLS[input.providerId];
		const client = new OpenAI({ apiKey: input.apiKey, ...(baseURL ? { baseURL } : {}) });

		this.reportProgress(ctx, 20, 'Submitting OCR request');

		const imageUrl = this.buildImageUrl(input);
		const prompt = input.prompt ?? DEFAULT_PROMPT;
		const languageHint = input.language ? ` Respond in ${input.language}.` : '';

		const response = await client.chat.completions.create(
			{
				model: input.modelName,
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: `${prompt}${languageHint}` },
							{ type: 'image_url', image_url: { url: imageUrl } },
						],
					},
				],
			},
			ctx.signal ? { signal: ctx.signal } : undefined
		);

		this.ensureNotAborted(ctx.signal);
		const text = response.choices[0]?.message?.content ?? '';
		const normalized = typeof text === 'string' ? text : '';

		const pages: OcrPage[] = [{ index: 0, text: normalized }];

		this.reportProgress(ctx, 100, 'OCR complete');
		return { text: normalized, pages, model: input.modelName };
	}

	private buildImageUrl(input: OcrAgentInput): string {
		if (input.sourceKind === 'url') return input.source;
		return `data:${input.mimeType};base64,${input.source}`;
	}
}
