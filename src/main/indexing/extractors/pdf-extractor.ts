/**
 * PdfExtractor — extracts text content from PDF files using pdf-parse v2.
 *
 * pdf-parse is a pure-JS library, so it works in Electron without native modules.
 */

import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import type { DocumentExtractor, ExtractedContent } from '../document-extractor';

export class PdfExtractor implements DocumentExtractor {
	readonly extensions = ['.pdf'] as const;

	async extract(filePath: string, signal: AbortSignal): Promise<ExtractedContent> {
		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const data = await fs.readFile(filePath);

		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const parser = new PDFParse({ data });
		try {
			const textResult = await parser.getText();
			const content = textResult.text;
			const pageCount = textResult.pages.length;

			return {
				content,
				metadata: {
					pageCount,
					charCount: content.length,
					format: 'pdf',
				},
			};
		} finally {
			await parser.destroy();
		}
	}
}
