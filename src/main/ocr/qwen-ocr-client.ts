/**
 * QwenOcrClient — wraps the OpenAI-compatible DashScope API to perform
 * OCR using Qwen's vision-language model (qwen-vl-ocr).
 *
 * The Qwen VL OCR model accepts images via the chat completions endpoint
 * and returns extracted text as the assistant response.
 */

import OpenAI from 'openai';

const DEFAULT_MODEL = 'qwen-vl-ocr-2025-11-20';
const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MIN_PIXELS = 32 * 32 * 3;
const DEFAULT_MAX_PIXELS = 32 * 32 * 8192;

export interface QwenOcrRequestOptions {
	/** The image URL to process. */
	imageUrl: string;
	/** Prompt instructing the model what to extract. */
	prompt: string;
	/** Model identifier (defaults to qwen-vl-ocr-2025-11-20). */
	model?: string;
	/** Minimum pixel count — images below this are upscaled. */
	minPixels?: number;
	/** Maximum pixel count — images above this are downscaled. */
	maxPixels?: number;
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
		const response = await this.client.chat.completions.create({
			model: options.model ?? DEFAULT_MODEL,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: options.prompt },
						{
							type: 'image_url',
							image_url: {
								url: options.imageUrl,
								// @ts-expect-error -- DashScope extension: pixel bounds are not in the OpenAI type
								min_pixels: options.minPixels ?? DEFAULT_MIN_PIXELS,
								max_pixels: options.maxPixels ?? DEFAULT_MAX_PIXELS,
							},
						},
					],
				},
			],
		});

		const text = response.choices[0]?.message?.content ?? '';

		return { text };
	}
}
