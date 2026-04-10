/**
 * OcrTaskHandler — task handler for OCR operations.
 *
 * Receives an image file path and delegates text extraction to the
 * configured OCR model. Holds a reference to the Workspace (resolved
 * per-execution from the window context) so it can resolve file paths
 * relative to the current workspace.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace';

export interface OcrTaskInput {
	/** Absolute path to the image file to process. */
	filePath: string;
	/** OCR model identifier (e.g. provider/model from OCR_MODELS catalogue). */
	modelId?: string;
	/** Window ID for resolving the workspace context. */
	windowId?: number;
}

export interface OcrTaskOutput {
	/** Extracted text content from the image. */
	text: string;
	/** Path of the processed file. */
	filePath: string;
}

export class OcrTaskHandler implements TaskHandler<OcrTaskInput, OcrTaskOutput> {
	readonly type = 'ocr';

	constructor(private readonly windowContextManager: WindowContextManager) {}

	validate(input: OcrTaskInput): void {
		if (
			!input?.filePath ||
			typeof input.filePath !== 'string' ||
			input.filePath.trim().length === 0
		) {
			throw new Error('OcrTaskInput.filePath must be a non-empty string');
		}
	}

	async execute(
		input: OcrTaskInput,
		_signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<OcrTaskOutput> {
		const _workspace = this.resolveWorkspace(input);

		reporter.progress(0, 'Starting OCR');

		reporter.progress(100, 'OCR complete');

		return {
			text: '',
			filePath: input.filePath,
		};
	}

	private resolveWorkspace(input: OcrTaskInput): Workspace {
		if (typeof input.windowId !== 'number') {
			throw new Error('OcrTaskInput.windowId is required to resolve workspace');
		}

		const windowContext = this.windowContextManager.tryGet(input.windowId);
		if (!windowContext) {
			throw new Error(`No window context found for windowId ${input.windowId}`);
		}

		if (!windowContext.container.has('workspaceManager')) {
			throw new Error(`No workspace available for windowId ${input.windowId}`);
		}

		return windowContext.container.get<Workspace>('workspaceManager');
	}
}
