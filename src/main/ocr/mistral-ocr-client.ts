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
	imageBase64?: string | null;
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
				? {
						type: 'document_url' as const,
						documentUrl: options.document.documentUrl,
					}
				: {
						type: 'image_url' as const,
						imageUrl: `data:${options.document.mimeType ?? 'application/pdf'};base64,${options.document.data}`,
					};

		const response = await this.client.ocr.process({
			model: options.model ?? DEFAULT_MODEL,
			document,
			includeImageBase64: options.includeImageBase64 ?? false,
		});

		console.log("response ocr mistral", response);

		const pages: OcrPage[] = response.pages.map((page) => ({
			index: page.index,
			markdown: page.markdown,
			images: page.images.map((img) => ({
				id: img.id,
				imageBase64: img.imageBase64,
			})),
		}));

		return { pages };
	}
}
