/**
 * Text Splitter — splits text into overlapping chunks for embedding.
 *
 * Wraps @langchain/textsplitters RecursiveCharacterTextSplitter
 * with a thin adapter that produces Document[] from @langchain/core.
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

export interface ChunkOptions {
	/** Maximum characters per chunk. */
	chunkSize?: number;
	/** Overlap between consecutive chunks. */
	chunkOverlap?: number;
}

/**
 * Split text content into overlapping Document chunks.
 *
 * @param content - Raw text to split
 * @param metadata - Metadata to attach to each chunk (source file, etc.)
 * @param options - Optional chunk size and overlap configuration
 * @returns Array of LangChain Document chunks
 */
export async function chunkText(
	content: string,
	metadata: Record<string, string | number>,
	options?: ChunkOptions
): Promise<Document[]> {
	const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize,
		chunkOverlap,
	});

	const docs = await splitter.createDocuments([content], [metadata]);

	return docs.map((doc, index) => {
		return new Document({
			pageContent: doc.pageContent,
			metadata: {
				...doc.metadata,
				chunkIndex: index,
			},
		});
	});
}
