/**
 * OcrTaskHandler — task handler for OCR operations.
 *
 * Receives a document file path and model identifier, delegates text
 * extraction to the appropriate OCR client (Mistral or Qwen), and
 * saves the extracted markdown to the workspace resources/files/ folder.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace';
import { MistralOcrClient, QwenOcrClient } from '../../ocr';
import type { ProviderResolver } from '../../shared/provider-resolver';
import { OCR_MODELS } from '../../../shared/models';
import type { FilesService } from '../../workspace/files-service';

export interface OcrTaskInput {
	/** URL or file path to the document to process. */
	url: string;
	/** OCR model identifier (e.g. "mistral-ocr-latest" or "qwen-vl-ocr-2025-11-20"). */
	modelId: string;
	/** Input type: 'url' for URL-based input. */
	inputType: string;
	/** Window ID for resolving the workspace context (stamped server-side). */
	windowId?: number;
}

export interface OcrTaskOutput {
	/** Extracted markdown text concatenated from all pages. */
	text: string;
	/** Path of the processed file. */
	filePath: string;
	/** Number of pages extracted. */
	pageCount: number;
	/** Path of the saved markdown file in resources/files/. */
	savedPath: string;
}

/** Maps an AppProviderName to the ProviderId used by ProviderResolver. */
const PROVIDER_NAME_TO_ID: Record<string, string> = {
	Mistral: 'mistral',
	Qwen: 'qwen',
};

export class OcrTaskHandler implements TaskHandler<OcrTaskInput, OcrTaskOutput> {
	readonly type = 'ocr';

	constructor(
		private readonly windowContextManager: WindowContextManager,
		private readonly providerResolver: ProviderResolver
	) {}

	validate(input: OcrTaskInput): void {
		if (!input?.url || typeof input.url !== 'string' || input.url.trim().length === 0) {
			throw new Error('OcrTaskInput.url must be a non-empty string');
		}
		if (!input.modelId || typeof input.modelId !== 'string' || input.modelId.trim().length === 0) {
			throw new Error('OcrTaskInput.modelId must be a non-empty string');
		}
		if (
			!input.inputType ||
			typeof input.inputType !== 'string' ||
			input.inputType.trim().length === 0
		) {
			throw new Error('OcrTaskInput.inputType must be a non-empty string');
		}
	}

	async execute(
		input: OcrTaskInput,
		_signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<OcrTaskOutput> {
		const workspace = this.resolveWorkspace(input);
		const filesService = this.resolveFilesService(input);

		reporter.progress(0, 'Starting OCR');

		const modelEntry = OCR_MODELS.find((m) => m.modelId === input.modelId);
		if (!modelEntry) {
			throw new Error(`Unknown OCR model: ${input.modelId}`);
		}

		const providerName = modelEntry.provider;
		const providerId = PROVIDER_NAME_TO_ID[providerName] ?? providerName.toLowerCase();

		const provider = this.providerResolver.resolve({
			providerId: providerName,
			modelId: input.modelId,
		});

		reporter.progress(10, 'Reading file');

		const resolvedPath = this.resolveFilePath(input.filePath, workspace);
		const fileBuffer = await fs.readFile(resolvedPath);
		const base64Data = fileBuffer.toString('base64');

		reporter.progress(30, 'Processing OCR');

		const text = await this.runOcr(providerId, provider, base64Data, input.modelId);

		reporter.progress(80, 'Saving result');

		const savedPath = await this.saveResult(workspace, filesService, resolvedPath, text);

		reporter.progress(100, 'OCR complete');

		return {
			text,
			filePath: input.filePath,
			pageCount: 1,
			savedPath,
		};
	}

	private async runOcr(
		providerId: string,
		provider: { apiKey: string; baseUrl?: string },
		base64Data: string,
		model: string
	): Promise<string> {
		if (providerId === 'qwen') {
			const client = new QwenOcrClient(provider.apiKey, provider.baseUrl);
			const imageUrl = `data:application/pdf;base64,${base64Data}`;
			const result = await client.process({
				imageUrl,
				prompt: 'Extract all text from this document.',
				model,
			});
			return result.text;
		}

		const client = new MistralOcrClient(provider.apiKey);
		const result = await client.process({
			document: { type: 'base64', data: base64Data },
			model,
		});
		return result.pages.map((page) => page.markdown).join('\n\n');
	}

	private async saveResult(
		workspace: Workspace,
		filesService: FilesService,
		sourcePath: string,
		text: string
	): Promise<string> {
		const workspacePath = workspace.getCurrent();
		if (!workspacePath) {
			throw new Error('No active workspace to save OCR result');
		}

		await filesService.ensureFilesDir(workspacePath);
		const filesDir = filesService.getFilesDir(workspacePath);

		const baseName = path.basename(sourcePath, path.extname(sourcePath));
		const timestamp = Date.now();
		const fileName = `${baseName}-ocr-${timestamp}.md`;
		const destPath = path.join(filesDir, fileName);

		await fs.writeFile(destPath, text, 'utf-8');

		return destPath;
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

	private resolveFilesService(input: OcrTaskInput): FilesService {
		if (typeof input.windowId !== 'number') {
			throw new Error('OcrTaskInput.windowId is required to resolve files service');
		}

		const windowContext = this.windowContextManager.tryGet(input.windowId);
		if (!windowContext) {
			throw new Error(`No window context found for windowId ${input.windowId}`);
		}

		if (!windowContext.container.has('filesService')) {
			throw new Error(`No files service available for windowId ${input.windowId}`);
		}

		return windowContext.container.get<FilesService>('filesService');
	}
}
