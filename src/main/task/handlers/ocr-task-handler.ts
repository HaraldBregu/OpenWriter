/**
 * OcrTaskHandler — task handler for OCR operations.
 *
 * Receives a document source (file path or URL) and delegates text
 * extraction to the Mistral OCR client. Holds a reference to the
 * Workspace (resolved per-execution from the window context) so it
 * can resolve file paths relative to the current workspace.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace';
import { MistralOcrClient } from '../../ocr';
import type { ProviderResolver } from '../../shared/provider-resolver';

export interface OcrTaskInput {
	/** Absolute path to the file to process. */
	filePath: string;
	/** OCR model identifier (defaults to mistral-ocr-latest). */
	modelId?: string;
	/** Whether to include base64-encoded images in the result. */
	includeImageBase64?: boolean;
	/** Window ID for resolving the workspace context. */
	windowId?: number;
}

export interface OcrTaskOutput {
	/** Extracted markdown text concatenated from all pages. */
	text: string;
	/** Path of the processed file. */
	filePath: string;
	/** Number of pages extracted. */
	pageCount: number;
}

export class OcrTaskHandler implements TaskHandler<OcrTaskInput, OcrTaskOutput> {
	readonly type = 'ocr';

	constructor(
		private readonly windowContextManager: WindowContextManager,
		private readonly providerResolver: ProviderResolver
	) {}

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
		const workspace = this.resolveWorkspace(input);

		reporter.progress(0, 'Starting OCR');

		const provider = this.providerResolver.resolve({
			providerId: 'mistral',
			modelId: input.modelId,
		});

		const client = new MistralOcrClient(provider.apiKey);

		reporter.progress(10, 'Reading file');

		const resolvedPath = this.resolveFilePath(input.filePath, workspace);
		const fileBuffer = await fs.readFile(resolvedPath);
		const base64Data = fileBuffer.toString('base64');

		reporter.progress(30, 'Processing OCR');

		const result = await client.process({
			document: { type: 'base64', data: base64Data },
			model: input.modelId,
			includeImageBase64: input.includeImageBase64,
		});

		reporter.progress(90, 'Extracting text');

		const text = result.pages.map((page) => page.markdown).join('\n\n');

		reporter.progress(100, 'OCR complete');

		return {
			text,
			filePath: input.filePath,
			pageCount: result.pages.length,
		};
	}

	private resolveFilePath(filePath: string, workspace: Workspace): string {
		if (path.isAbsolute(filePath)) {
			return filePath;
		}

		const workspacePath = workspace.getCurrent();
		if (!workspacePath) {
			throw new Error('No active workspace to resolve relative file path');
		}

		return path.resolve(workspacePath, filePath);
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
