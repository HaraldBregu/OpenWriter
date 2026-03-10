/**
 * DocumentExtractor — Strategy interface for extracting text content from files.
 *
 * Each implementation handles one or more MIME types / file extensions.
 * Registered in ExtractorRegistry and resolved by the indexing pipeline.
 */

export interface ExtractedContent {
	/** Extracted plain text from the file. */
	content: string;
	/** Metadata about the extraction (page count, word count, etc.). */
	metadata: Record<string, string | number>;
}

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
