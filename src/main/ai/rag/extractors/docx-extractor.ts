/**
 * DocxExtractor — extracts text content from .docx files using mammoth.
 *
 * mammoth is a pure-JS library, so it works in Electron without native modules.
 */

import fs from 'node:fs/promises';
import mammoth from 'mammoth';
import type { DocumentExtractor, ExtractedContent } from './document-extractor';

export class DocxExtractor implements DocumentExtractor {
	readonly extensions = ['.docx'] as const;

	async extract(filePath: string, signal: AbortSignal): Promise<ExtractedContent> {
		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const buffer = await fs.readFile(filePath);

		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const result = await mammoth.extractRawText({ buffer });
		const content = result.value;

		return {
			content,
			metadata: {
				charCount: content.length,
				format: 'docx',
				warnings: result.messages.length,
			},
		};
	}
}
