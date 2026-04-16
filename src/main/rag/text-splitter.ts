/**
 * Text Splitter — splits text into overlapping chunks for embedding.
 *
 * Custom recursive character splitter that produces DocumentChunk[]
 * with configurable separators, chunk size, and overlap.
 */

import type { DocumentChunk } from '../shared/ai-types';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_SEPARATORS = ['\n\n', '\n', ' ', ''];

export interface ChunkOptions {
	/** Maximum characters per chunk. */
	chunkSize?: number;
	/** Overlap between consecutive chunks. */
	chunkOverlap?: number;
}

/**
 * Split text content into overlapping DocumentChunk chunks.
 *
 * @param content - Raw text to split
 * @param metadata - Metadata to attach to each chunk (source file, etc.)
 * @param options - Optional chunk size and overlap configuration
 * @returns Array of document chunks
 */
export async function chunkText(
	content: string,
	metadata: Record<string, string | number>,
	options?: ChunkOptions
): Promise<DocumentChunk[]> {
	const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

	const textChunks = splitRecursively(content, DEFAULT_SEPARATORS, chunkSize, chunkOverlap);

	return textChunks.map((text, index) => ({
		pageContent: text,
		metadata: {
			...metadata,
			chunkIndex: index,
		},
	}));
}

function splitRecursively(
	text: string,
	separators: string[],
	chunkSize: number,
	chunkOverlap: number
): string[] {
	if (text.length <= chunkSize) {
		return text.trim().length > 0 ? [text] : [];
	}

	const separator = findBestSeparator(text, separators);
	const parts = separator === '' ? splitByCharacter(text, chunkSize) : text.split(separator);

	return mergeChunks(parts, separator, chunkSize, chunkOverlap);
}

function findBestSeparator(text: string, separators: string[]): string {
	for (const sep of separators) {
		if (sep === '') return sep;
		if (text.includes(sep)) return sep;
	}
	return '';
}

function splitByCharacter(text: string, chunkSize: number): string[] {
	const parts: string[] = [];
	for (let i = 0; i < text.length; i += chunkSize) {
		parts.push(text.slice(i, i + chunkSize));
	}
	return parts;
}

function mergeChunks(
	parts: string[],
	separator: string,
	chunkSize: number,
	chunkOverlap: number
): string[] {
	const chunks: string[] = [];
	let current: string[] = [];
	let currentLength = 0;

	for (const part of parts) {
		const partLength = part.length;
		const separatorLength = current.length > 0 ? separator.length : 0;

		if (currentLength + partLength + separatorLength > chunkSize && current.length > 0) {
			const merged = current.join(separator).trim();
			if (merged.length > 0) {
				chunks.push(merged);
			}

			// Keep overlap by dropping parts from the front until under overlap size
			while (currentLength > chunkOverlap && current.length > 1) {
				const dropped = current.shift()!;
				currentLength -= dropped.length + separator.length;
			}
		}

		current.push(part);
		currentLength += partLength + separatorLength;
	}

	if (current.length > 0) {
		const merged = current.join(separator).trim();
		if (merged.length > 0) {
			chunks.push(merged);
		}
	}

	return chunks;
}
