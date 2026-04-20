import type { DocumentChunk } from '../../shared/ai-types';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 150;

export interface SplitOptions {
	chunkSize?: number;
	chunkOverlap?: number;
}

/**
 * Character-window splitter.
 *
 * Slides a window of `chunkSize` across `text`, stepping forward by
 * `chunkSize - chunkOverlap`. Simple and deterministic — adequate for
 * documentation and markdown. Replace with a token-aware splitter if
 * precise token budgets matter.
 */
export function splitText(
	text: string,
	metadata: Record<string, unknown> = {},
	options: SplitOptions = {}
): DocumentChunk[] {
	const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const overlap = Math.min(options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, chunkSize - 1);
	const step = Math.max(1, chunkSize - overlap);

	if (text.length <= chunkSize) {
		return [{ pageContent: text, metadata: { ...metadata, chunkIndex: 0 } }];
	}

	const chunks: DocumentChunk[] = [];
	let index = 0;
	for (let start = 0; start < text.length; start += step) {
		const slice = text.slice(start, start + chunkSize);
		if (!slice.trim()) continue;
		chunks.push({ pageContent: slice, metadata: { ...metadata, chunkIndex: index } });
		index += 1;
		if (start + chunkSize >= text.length) break;
	}
	return chunks;
}
