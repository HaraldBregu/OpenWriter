/**
 * RagIndexingTaskHandler — thin task adapter for the Embedder.
 *
 * It validates the stamped task input, forwards indexing progress to the
 * task reporter, and returns the embedder result unchanged.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';
import { Embedder, type VectorIndexingProgressEvent } from '../../rag';

/** Progress weight allocation for each RAG indexing phase. */
const PHASE_EXTRACT = 30;
const PHASE_INDEX = 20;
const PHASE_EMBED = 40;
const PHASE_SAVE = 10;

export interface RagIndexingTaskInput {
	/** Injected server-side by task-manager-ipc. */
	windowId: number;
}

export interface RagIndexingTaskOutput {
	/** Number of documents successfully indexed. */
	indexedCount: number;
	/** IDs that failed (if any). */
	failedIds: string[];
	/** Total chunks stored in the vector store. */
	totalChunks: number;
}

export class RagIndexingTaskHandler implements TaskHandler<
	RagIndexingTaskInput,
	RagIndexingTaskOutput
> {
	readonly type = 'index-resources';

	validate(input: RagIndexingTaskInput): void {
		if (!input?.windowId) {
			throw new Error('windowId is required (injected server-side)');
		}
	}

	async execute(
		_input: RagIndexingTaskInput,
		_signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<RagIndexingTaskOutput> {
		reporter.progress(0, 'Preparing RAG indexing');

		const result = await new Embedder().run({
			onProgress: (event) => {
				reporter.progress(mapRagIndexingProgressToPercent(event), event.message);
			},
		});

		reporter.progress(
			100,
			result.indexedCount === 0 && result.failedIds.length === 0 && result.totalChunks === 0
				? 'No documents to index'
				: 'Indexing complete'
		);

		return result;
	}
}

function mapRagIndexingProgressToPercent(event: VectorIndexingProgressEvent): number {
	switch (event.phase) {
		case 'extract':
			return scaleProgress(event.completed, event.total, 0, PHASE_EXTRACT);

		case 'index':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_EXTRACT,
				PHASE_EXTRACT + PHASE_INDEX
			);

		case 'embed':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_EXTRACT + PHASE_INDEX,
				PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED
			);

		case 'save':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED,
				PHASE_EXTRACT + PHASE_INDEX + PHASE_EMBED + PHASE_SAVE
			);

		default:
			return 0;
	}
}

function scaleProgress(completed: number, total: number, start: number, end: number): number {
	if (total <= 0) {
		return start;
	}

	return start + Math.round((completed / total) * (end - start));
}
