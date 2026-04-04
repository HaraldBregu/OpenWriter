/**
 * ExtractorRegistry — maps file extensions to DocumentExtractor implementations.
 *
 * Uses the Strategy pattern: the indexing pipeline resolves the correct
 * extractor at runtime based on the file extension, without knowing
 * the concrete implementation.
 */

import type { DocumentExtractor } from './extractors/document-extractor';

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
