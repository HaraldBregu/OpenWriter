/**
 * RagPaths — derives all RAG storage paths from a workspace root.
 *
 * Single source of truth for where the vector store, document index, and
 * related artifacts live on disk. Consumers pass a workspace path and read
 * the resolved absolute paths — no path constants scattered across callers.
 */

import path from 'node:path';

const VECTOR_STORE_SUBDIR = path.join('data', 'vector_store');
const DOCUMENT_INDEX_SUBDIR = path.join('data', 'rag_index');

export class RagPaths {
	/** Absolute path to the vector store directory. */
	readonly vectorStore: string;
	/** Absolute path to the document index directory. */
	readonly documentIndex: string;

	constructor(workspacePath: string) {
		this.vectorStore = path.join(workspacePath, VECTOR_STORE_SUBDIR);
		this.documentIndex = path.join(workspacePath, DOCUMENT_INDEX_SUBDIR);
	}
}
