/**
 * PdfExtractor — extracts text content from PDF files using pdf-parse.
 *
 * pdf-parse is a pure-JS library, so it works in Electron without native modules.
 */

import fs from 'node:fs/promises';
import * as pdfParseModule from 'pdf-parse';

const pdfParse = (pdfParseModule as { default?: typeof pdfParseModule }).default ?? pdfParseModule;
import type { DocumentExtractor, ExtractedContent } from '../document-extractor';

export class PdfExtractor implements DocumentExtractor {
	readonly extensions = ['.pdf'] as const;

	async extract(filePath: string, signal: AbortSignal): Promise<ExtractedContent> {
		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const buffer = await fs.readFile(filePath);

		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const result = await pdfParse(buffer);

		return {
			content: result.text,
			metadata: {
				pageCount: result.numpages,
				charCount: result.text.length,
				format: 'pdf',
			},
		};
	}
}
