/**
 * MistralOcrClient — wraps the Mistral SDK to perform OCR on documents.
 *
 * Accepts either a document URL or a base64-encoded file and returns
 * the extracted text pages produced by the `mistral-ocr-latest` model.
 */

import { Mistral } from '@mistralai/mistralai';

const DEFAULT_MODEL = 'mistral-ocr-latest';

export interface OcrDocumentUrl {
	type: 'document_url';
	documentUrl: string;
}

export interface OcrBase64 {
	type: 'base64';
	data: string;
	mimeType?: string;
}

export type OcrDocumentSource = OcrDocumentUrl | OcrBase64;

export interface OcrRequestOptions {
	document: OcrDocumentSource;
	model?: string;
	includeImageBase64?: boolean;
}

export interface OcrPage {
	index: number;
	markdown: string;
	images: OcrPageImage[];
}

export interface OcrPageImage {
	id: string;
	imageBase64?: string;
}

export interface OcrResult {
	pages: OcrPage[];
}

export class MistralOcrClient {
	private readonly client: Mistral;

	constructor(apiKey: string) {
		this.client = new Mistral({ apiKey });
	}

	async process(options: OcrRequestOptions): Promise<OcrResult> {
		const document =
			options.document.type === 'document_url'
				? { type: 'document_url' as const, documentUrl: options.document.documentUrl }
				: { type: 'base64' as const, data: options.document.data };

		const response = await this.client.ocr.process({
			model: options.model ?? DEFAULT_MODEL,
			document,
			includeImageBase64: options.includeImageBase64 ?? false,
		});

		const pages: OcrPage[] = (response.pages ?? []).map((page, index) => ({
			index,
			markdown: (page as Record<string, unknown>).markdown as string,
			images: Array.isArray((page as Record<string, unknown>).images)
				? ((page as Record<string, unknown>).images as Array<Record<string, unknown>>).map(
						(img) => ({
							id: img.id as string,
							imageBase64: img.imageBase64 as string | undefined,
						})
					)
				: [],
		}));

		return { pages };
	}
}
