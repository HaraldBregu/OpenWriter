/**
 * PlainTextExtractor — extracts content from plain-text file formats.
 *
 * Handles: .txt, .md, .csv, .json, .html
 * For HTML, strips tags to produce plain text.
 */

import fs from 'node:fs/promises';
import type { DocumentExtractor, ExtractedContent } from './document-extractor';

export class PlainTextExtractor implements DocumentExtractor {
	readonly extensions = ['.txt', '.md', '.csv', '.json', '.html'] as const;

	async extract(filePath: string, signal: AbortSignal): Promise<ExtractedContent> {
		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}

		const raw = await fs.readFile(filePath, 'utf-8');

		const isHtml = filePath.toLowerCase().endsWith('.html');
		const content = isHtml ? this.stripHtmlTags(raw) : raw;

		return {
			content,
			metadata: {
				charCount: content.length,
				format: isHtml ? 'html' : 'text',
			},
		};
	}

	private stripHtmlTags(html: string): string {
		return html
			.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
			.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}
}
