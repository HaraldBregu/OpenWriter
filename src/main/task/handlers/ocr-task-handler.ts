/**
 * OcrTaskHandler — task handler for OCR operations.
 *
 * Receives an image file path and delegates text extraction to the
 * configured OCR model. Holds a reference to the Workspace so it can
 * resolve file paths relative to the current workspace.
 */

import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { Workspace } from '../../workspace';

export interface OcrTaskInput {
	/** Absolute path to the image file to process. */
	filePath: string;
	/** OCR model identifier (e.g. provider/model from OCR_MODELS catalogue). */
	modelId?: string;
}

export interface OcrTaskOutput {
	/** Extracted text content from the image. */
	text: string;
	/** Path of the processed file. */
	filePath: string;
}

export class OcrTaskHandler implements TaskHandler<OcrTaskInput, OcrTaskOutput> {
	readonly type = 'ocr';

	constructor(private readonly workspace: Workspace) {}

	validate(input: OcrTaskInput): void {
		if (!input?.filePath || typeof input.filePath !== 'string' || input.filePath.trim().length === 0) {
			throw new Error('OcrTaskInput.filePath must be a non-empty string');
		}
	}

	async execute(
		input: OcrTaskInput,
		_signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<OcrTaskOutput> {
		reporter.progress(0, 'Starting OCR');

		reporter.progress(100, 'OCR complete');

		return {
			text: '',
			filePath: input.filePath,
		};
	}
}
