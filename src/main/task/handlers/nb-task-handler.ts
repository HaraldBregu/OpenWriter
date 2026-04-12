/**
 * NbTaskHandler — task adapter for the knowledge base builder.
 *
 * Validates the task input, delegates to buildKnowledgeBase, and forwards
 * progress events to the task reporter as percentages.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';
import {
	buildKnowledgeBase,
	type KnowledgeBaseBuildProgress,
} from '../../data/knowledge-base-builder';

const PHASE_CHUNK = 30;
const PHASE_EMBED = 50;
const PHASE_SAVE = 20;

export interface NbTaskInput {
	markdownPaths: string[];
	targetPath: string;
	apiKey: string;
	model?: string;
	baseURL?: string;
	chunkSize?: number;
	chunkOverlap?: number;
}

export interface NbTaskOutput {
	indexedCount: number;
	failedPaths: string[];
	totalChunks: number;
}

export class NbTaskHandler implements TaskHandler<NbTaskInput, NbTaskOutput> {
	readonly type = 'build-knowledge-base';

	validate(input: NbTaskInput): void {
		if (!Array.isArray(input?.markdownPaths) || input.markdownPaths.length === 0) {
			throw new Error('NbTaskInput.markdownPaths must be a non-empty array');
		}

		for (const p of input.markdownPaths) {
			if (typeof p !== 'string' || p.trim().length === 0) {
				throw new Error('Each entry in markdownPaths must be a non-empty string');
			}
		}

		if (!input.targetPath || typeof input.targetPath !== 'string' || input.targetPath.trim().length === 0) {
			throw new Error('NbTaskInput.targetPath must be a non-empty string');
		}

		if (!input.apiKey || typeof input.apiKey !== 'string' || input.apiKey.trim().length === 0) {
			throw new Error('NbTaskInput.apiKey must be a non-empty string');
		}
	}

	async execute(
		input: NbTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<NbTaskOutput> {
		reporter.progress(0, 'Preparing knowledge base build');

		const result = await buildKnowledgeBase({
			markdownPaths: input.markdownPaths,
			targetPath: input.targetPath,
			embeddingOptions: {
				apiKey: input.apiKey,
				model: input.model,
				baseURL: input.baseURL,
			},
			chunkOptions:
				input.chunkSize !== undefined || input.chunkOverlap !== undefined
					? { chunkSize: input.chunkSize, chunkOverlap: input.chunkOverlap }
					: undefined,
			signal,
			onProgress: (event) => {
				reporter.progress(mapProgressToPercent(event), event.message);
			},
		});

		reporter.progress(
			100,
			result.indexedCount === 0 && result.failedPaths.length === 0
				? 'No documents to index'
				: 'Knowledge base build complete'
		);

		return result;
	}
}

function mapProgressToPercent(event: KnowledgeBaseBuildProgress): number {
	switch (event.phase) {
		case 'chunk':
			return scaleProgress(event.completed, event.total, 0, PHASE_CHUNK);

		case 'embed':
			return scaleProgress(event.completed, event.total, PHASE_CHUNK, PHASE_CHUNK + PHASE_EMBED);

		case 'save':
			return scaleProgress(
				event.completed,
				event.total,
				PHASE_CHUNK + PHASE_EMBED,
				PHASE_CHUNK + PHASE_EMBED + PHASE_SAVE
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
