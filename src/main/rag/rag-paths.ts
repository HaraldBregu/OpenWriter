/**
 * RagPaths — derives all RAG storage paths from a WorkspaceService instance.
 *
 * Single source of truth for where the vector store, document index, and
 * related artifacts live on disk. Callers pass a WorkspaceService and read
 * the resolved absolute paths — no path constants scattered across callers.
 */

import path from 'node:path';
import type { WorkspaceService } from '../workspace/workspace-service';

const VECTOR_STORE_SUBDIR = path.join('data', 'vector_store');
const DOCUMENT_INDEX_SUBDIR = path.join('data', 'rag_index');

export class RagPaths {
	/** Absolute path to the vector store directory. */
	readonly vectorStore: string;
	/** Absolute path to the document index directory. */
	readonly documentIndex: string;

	constructor(workspaceService: WorkspaceService) {
		const workspacePath = workspaceService.getCurrent();
		if (!workspacePath) {
			throw new Error('No workspace is open');
		}
		this.vectorStore = path.join(workspacePath, VECTOR_STORE_SUBDIR);
		this.documentIndex = path.join(workspacePath, DOCUMENT_INDEX_SUBDIR);
	}
}
