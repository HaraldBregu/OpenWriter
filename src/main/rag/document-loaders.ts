/**
 * Document Loaders — loads and extracts content from files.
 *
 * Uses the Strategy pattern: each file type (txt, md, html, etc.) has a
 * dedicated extractor that the registry resolves at runtime.
 */

import fs from 'node:fs/promises';

/**
 * Extracted content from a document, including text and metadata.
 */
export interface ExtractedContent {
	/** Extracted plain text from the file. */
	content: string;
	/** Metadata about the extraction (page count, word count, etc.). */
	metadata: Record<string, string | number>;
}

/**
 * DocumentExtractor — Strategy interface for extracting text content from files.
 *
 * Each implementation handles one or more MIME types / file extensions.
 * Registered in ExtractorRegistry and resolved by the indexing pipeline.
 */
export interface DocumentExtractor {
	/** File extensions this extractor handles (e.g., ['.txt', '.md']). */
	readonly extensions: readonly string[];

	/**
	 * Extract text content from a file.
	 *
	 * @param filePath - Absolute path to the file
	 * @param signal - Abort signal for cancellation
	 * @returns Extracted content and metadata
	 */
	extract(filePath: string, signal: AbortSignal): Promise<ExtractedContent>;
}

/**
 * PlainTextExtractor — extracts content from plain-text file formats.
 *
 * Handles: .txt, .md, .csv, .json, .html
 * For HTML, strips tags to produce plain text.
 */
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

/**
 * ExtractorRegistry — maps file extensions to DocumentExtractor implementations.
 *
 * Uses the Strategy pattern: the indexing pipeline resolves the correct
 * extractor at runtime based on the file extension, without knowing
 * the concrete implementation.
 */
export class ExtractorRegistry {
	private readonly map = new Map<string, DocumentExtractor>();

	/**
	 * Register an extractor for all its declared extensions.
	 */
	register(extractor: DocumentExtractor): void {
		for (const ext of extractor.extensions) {
			this.map.set(ext.toLowerCase(), extractor);
		}
	}

	/**
	 * Resolve an extractor for the given file extension.
	 *
	 * @param extension - File extension including the dot (e.g., '.txt')
	 * @returns The matching extractor, or null if unsupported
	 */
	resolve(extension: string): DocumentExtractor | null {
		return this.map.get(extension.toLowerCase()) ?? null;
	}

	/**
	 * Check whether a file extension is supported.
	 */
	supports(extension: string): boolean {
		return this.map.has(extension.toLowerCase());
	}
}
