/**
 * MistralOcrClient — wraps the Mistral SDK to perform OCR on documents.
 *
 * Accepts a document URL, a base64-encoded PDF/document, or a base64-encoded
 * image and returns the extracted text pages produced by the
 * `mistral-ocr-latest` model.
 *
 * For local PDFs we follow Mistral's base64 approach: encode the bytes and
 * pass them on `document.documentUrl` as a `data:application/pdf;base64,...`
 * URI. Images follow the same pattern via `image_url`.
 */

import { Mistral } from '@mistralai/mistralai';
import type { LoggerService } from '../services/logger';

const DEFAULT_MODEL = 'mistral-ocr-latest';
const LOG_SOURCE = 'MistralOcrClient';

export interface OcrDocumentUrl {
	type: 'document_url';
	documentUrl: string;
}

export interface OcrDocumentBase64 {
	type: 'document_base64';
	data: string;
	mimeType: string;
}

export interface OcrImageBase64 {
	type: 'image_base64';
	data: string;
	mimeType: string;
}

export type OcrDocumentSource = OcrDocumentUrl | OcrDocumentBase64 | OcrImageBase64;

export interface OcrRequestOptions {
	document: OcrDocumentSource;
	model?: string;
	includeImageBase64?: boolean;
	tableFormat?: 'markdown' | 'html';
	signal?: AbortSignal;
}

export interface OcrPage {
	index: number;
	markdown: string;
	images: OcrPageImage[];
}

export interface OcrPageImage {
	id: string;
	imageBase64?: string | null;
}

export interface OcrResult {
	pages: OcrPage[];
}

type OcrDocument =
	| { type: 'document_url'; documentUrl: string }
	| { type: 'image_url'; imageUrl: string };

export class MistralOcrClient {
	private readonly client: Mistral;

	constructor(
		apiKey: string,
		private readonly logger?: LoggerService
	) {
		this.client = new Mistral({ apiKey });
	}

	async process(options: OcrRequestOptions): Promise<OcrResult> {
		const { signal } = options;
		throwIfAborted(signal);

		const model = options.model ?? DEFAULT_MODEL;
		const document = this.buildDocument(options.document);

		this.logger?.info(LOG_SOURCE, 'Calling Mistral OCR API', {
			model,
			documentType: document.type,
			tableFormat: options.tableFormat ?? 'default',
			includeImageBase64: options.includeImageBase64 ?? true,
		});

		try {
			const response = await this.client.ocr.process(
				{
					model,
					document,
					tableFormat: options.tableFormat ?? 'html',
					includeImageBase64: options.includeImageBase64 ?? true,
				},
				{ signal }
			);

			const pages: OcrPage[] = response.pages.map((page) => ({
				index: page.index,
				markdown: page.markdown,
				images: page.images.map((img) => ({
					id: img.id,
					imageBase64: img.imageBase64,
				})),
			}));

			this.logger?.info(LOG_SOURCE, 'Mistral OCR API returned', {
				pageCount: pages.length,
				totalMarkdownChars: pages.reduce((sum, p) => sum + p.markdown.length, 0),
			});

			return { pages };
		} catch (err) {
			this.logError(err, { model, documentType: document.type });
			throw err;
		}
	}

	private buildDocument(source: OcrDocumentSource): OcrDocument {
		if (source.type === 'document_url') {
			return { type: 'document_url', documentUrl: source.documentUrl };
		}

		if (source.type === 'document_base64') {
			return {
				type: 'document_url',
				documentUrl: `data:${source.mimeType};base64,${source.data}`,
			};
		}

		return {
			type: 'image_url',
			imageUrl: `data:${source.mimeType};base64,${source.data}`,
		};
	}

	private logError(err: unknown, context: Record<string, unknown>): void {
		if (!this.logger) {
			return;
		}

		const payload: Record<string, unknown> = { ...context };

		if (err instanceof Error) {
			payload.name = err.name;
			payload.message = err.message;
			payload.stack = err.stack;
		} else {
			payload.error = String(err);
		}

		const candidate = err as {
			statusCode?: number;
			status?: number;
			body?: unknown;
			rawResponse?: { status?: number; statusText?: string };
		};
		if (typeof candidate.statusCode === 'number') {
			payload.statusCode = candidate.statusCode;
		}
		if (typeof candidate.status === 'number') {
			payload.status = candidate.status;
		}
		if (candidate.body !== undefined) {
			payload.body = candidate.body;
		}
		if (candidate.rawResponse) {
			payload.rawResponse = {
				status: candidate.rawResponse.status,
				statusText: candidate.rawResponse.statusText,
			};
		}

		this.logger.error(LOG_SOURCE, 'Mistral OCR API call failed', payload);
	}
}

function throwIfAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}
