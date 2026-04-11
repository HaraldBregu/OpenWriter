/**
 * MistralOcrClient — wraps the Mistral SDK to perform OCR on documents.
 *
 * Accepts a document URL, raw bytes for upload, or an image as a base64 data
 * URL, and returns the extracted text pages produced by the
 * `mistral-ocr-latest` model.
 *
 * For local PDFs the Mistral OCR API does not accept inline base64 payloads,
 * so we upload the file via the Files API (purpose: "ocr") and reference it
 * by id on the OCR request. Images can still be sent inline as data URLs.
 */

import { Mistral } from '@mistralai/mistralai';

const DEFAULT_MODEL = 'mistral-ocr-latest';

export interface OcrDocumentUrl {
	type: 'document_url';
	documentUrl: string;
}

export interface OcrFileUpload {
	type: 'file';
	fileName: string;
	content: Uint8Array;
}

export interface OcrImageBase64 {
	type: 'image_base64';
	data: string;
	mimeType: string;
}

export type OcrDocumentSource = OcrDocumentUrl | OcrFileUpload | OcrImageBase64;

export interface OcrRequestOptions {
	document: OcrDocumentSource;
	model?: string;
	includeImageBase64?: boolean;
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
	/** File id returned by the Files API when the source was uploaded. */
	uploadedFileId?: string;
}

type OcrDocument =
	| { type: 'document_url'; documentUrl: string }
	| { type: 'file'; fileId: string }
	| { type: 'image_url'; imageUrl: string };

export class MistralOcrClient {
	private readonly client: Mistral;

	constructor(apiKey: string) {
		this.client = new Mistral({ apiKey });
	}

	async process(options: OcrRequestOptions): Promise<OcrResult> {
		const document = await this.buildDocument(options.document);

		const response = await this.client.ocr.process({
			model: options.model ?? DEFAULT_MODEL,
			document,
			includeImageBase64: options.includeImageBase64 ?? false,
		});

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

	private async buildDocument(source: OcrDocumentSource): Promise<OcrDocument> {
		if (source.type === 'document_url') {
			return { type: 'document_url', documentUrl: source.documentUrl };
		}

		if (source.type === 'image_base64') {
			return {
				type: 'image_url',
				imageUrl: `data:${source.mimeType};base64,${source.data}`,
			};
		}

		const uploaded = await this.client.files.upload({
			file: { fileName: source.fileName, content: source.content },
			purpose: 'ocr',
		});

		return { type: 'file', fileId: uploaded.id };
	}
}
