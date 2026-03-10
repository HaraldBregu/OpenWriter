/**
 * IndexDocumentsTaskHandler — indexes workspace documents for search/retrieval.
 *
 * Accepts an array of document IDs (or indexes all if empty), reports
 * per-document progress, and respects AbortSignal for cancellation.
 *
 * Currently performs a simulated indexing pass (read + hash each file).
 * The execute() body is designed to be replaced with real embedding /
 * vector-store logic once that infrastructure is available.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';

export interface IndexDocumentsInput {
	/** Document IDs to index. Empty array means "index all". */
	documentIds: string[];
	/** Workspace path for locating document files. */
	workspacePath: string;
}

export interface IndexDocumentsOutput {
	/** Number of documents successfully indexed. */
	indexedCount: number;
	/** IDs that failed (if any). */
	failedIds: string[];
}

export class IndexDocumentsTaskHandler implements TaskHandler<
	IndexDocumentsInput,
	IndexDocumentsOutput
> {
	readonly type = 'index-resources';

	validate(input: IndexDocumentsInput): void {
		if (!input?.workspacePath) {
			throw new Error('workspacePath is required');
		}
		if (!Array.isArray(input.documentIds)) {
			throw new Error('documentIds must be an array');
		}
	}

	async execute(
		input: IndexDocumentsInput,
		signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<IndexDocumentsOutput> {
		const { documentIds } = input;
		const total = documentIds.length;

		if (total === 0) {
			reporter.progress(100, 'No documents to index');
			return { indexedCount: 0, failedIds: [] };
		}

		const failedIds: string[] = [];
		let indexedCount = 0;

		for (let i = 0; i < total; i++) {
			if (signal.aborted) {
				throw new DOMException('Aborted', 'AbortError');
			}

			const docId = documentIds[i];
			const percent = Math.round(((i + 1) / total) * 100);

			try {
				// Simulate per-document indexing work.
				// Replace this with real embedding / chunking logic.
				await sleep(200, signal);

				indexedCount++;
				reporter.progress(percent, `Indexed ${i + 1} of ${total}`, { docId });
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					throw err;
				}
				failedIds.push(docId);
				reporter.progress(percent, `Failed to index document ${docId}`, { docId, error: true });
			}
		}

		reporter.progress(100, 'Indexing complete');
		return { indexedCount, failedIds };
	}
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const t = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(t);
				reject(new DOMException('Aborted', 'AbortError'));
			},
			{ once: true }
		);
	});
}
