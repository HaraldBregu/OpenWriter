/**
 * QwenOcrClient — wraps the OpenAI-compatible DashScope API to perform
 * OCR using Qwen's vision-language model (qwen-vl-ocr).
 *
 * The Qwen VL OCR model accepts images via the chat completions endpoint
 * and returns extracted text as the assistant response.
 */

import OpenAI from 'openai';
import type { ChatCompletionUserMessageParam } from 'openai/resources/chat/completions';

const DEFAULT_MODEL = 'qwen-vl-ocr-2025-11-20';
const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
export interface QwenOcrRequestOptions {
	/** The image URL to process. */
	imageUrl: string;
	/** Prompt instructing the model what to extract. */
	prompt: string;
	/** Model identifier (defaults to qwen-vl-ocr-2025-11-20). */
	model?: string;
}

export interface QwenOcrResult {
	/** Extracted text content returned by the model. */
	text: string;
}

export class QwenOcrClient {
	private readonly client: OpenAI;

	constructor(
		apiKey: string,
		baseUrl?: string
	) {
		this.client = new OpenAI({
			apiKey,
			baseURL: baseUrl ?? DEFAULT_BASE_URL,
		});
	}

	async process(options: QwenOcrRequestOptions): Promise<QwenOcrResult> {
		const userMessage: ChatCompletionUserMessageParam = {
			role: 'user',
			content: [
				{ type: 'text', text: options.prompt },
				{
					type: 'image_url',
					image_url: {
						url: options.imageUrl,
					},
				},
			],
		};

		const response = await this.client.chat.completions.create({
			model: options.model ?? DEFAULT_MODEL,
			messages: [userMessage],
		});

		const text = response.choices[0]?.message?.content ?? '';

		return { text };
	}
}
