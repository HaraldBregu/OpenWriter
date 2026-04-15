/**
 * OcrTaskHandler — task handler for OCR operations.
 *
 * Receives a document URL (or file path) with a model identifier and input type,
 * delegates text extraction to the Mistral OCR client, and saves the extracted
 * markdown to resources/content/<source-basename>/<uuid>.md in the workspace.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace';
import { MistralOcrClient } from '../../ocr';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { ContentsService } from '../../workspace/contents-service';
import type { LoggerService } from '../../services/logger';
import type { Service } from '../../../shared/types';

export interface OcrTaskInput {
	/** URL or file path to the document to process. */
	url: string;
	/** OCR model identifier (e.g. "mistral-ocr-latest"). */
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

export class OcrTaskHandler implements TaskHandler<OcrTaskInput, OcrTaskOutput> {
	readonly type = 'ocr';
	private static readonly LOG_SOURCE = 'OcrTaskHandler';

	constructor(
		private readonly windowContextManager: WindowContextManager,
		private readonly serviceResolver: ServiceResolver,
		private readonly modelResolver: ModelResolver,
		private readonly logger?: LoggerService
	) {}

	validate(input: OcrTaskInput): void {
		this.logger?.info(OcrTaskHandler.LOG_SOURCE, 'Validating input', {
			url: input?.url,
			modelId: input?.modelId,
			inputType: input?.inputType,
			windowId: input?.windowId,
		});

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

		this.logger?.info(OcrTaskHandler.LOG_SOURCE, 'Validation passed');
	}

	async execute(
		input: OcrTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter
	): Promise<OcrTaskOutput> {
		this.logger?.info(OcrTaskHandler.LOG_SOURCE, 'Execute started', {
			url: input.url,
			modelId: input.modelId,
			inputType: input.inputType,
			windowId: input.windowId,
		});

		const workspace = this.resolveWorkspace(input);
		const contentsService = this.resolveContentsService(input);

		reporter.progress(0, 'Starting OCR');
		OcrTaskHandler.throwIfAborted(signal);

		const modelEntry = this.modelResolver.resolve({ modelId: input.modelId });
		if (modelEntry.type !== 'ocr') {
			this.logger?.error(
				OcrTaskHandler.LOG_SOURCE,
				`Model "${input.modelId}" is not an OCR model (type=${modelEntry.type})`
			);
			throw new Error(`Model "${input.modelId}" is not an OCR model`);
		}

		this.logger?.info(OcrTaskHandler.LOG_SOURCE, `Resolved provider: ${modelEntry.providerId}`);

		const service = this.serviceResolver.resolve({ providerId: modelEntry.providerId });
		this.logger?.info(OcrTaskHandler.LOG_SOURCE, 'Service resolved successfully');

		reporter.progress(10, 'Reading file');
		OcrTaskHandler.throwIfAborted(signal);

		const resolvedPath = this.resolveFilePath(input.url, workspace);
		this.logger?.info(OcrTaskHandler.LOG_SOURCE, `Reading file: ${resolvedPath}`);
		const fileBuffer = await fs.readFile(resolvedPath);
		this.logger?.info(OcrTaskHandler.LOG_SOURCE, `File read, bytes: ${fileBuffer.byteLength}`);

		reporter.progress(30, 'Processing OCR');
		OcrTaskHandler.throwIfAborted(signal);

		this.logger?.info(OcrTaskHandler.LOG_SOURCE, `Calling OCR API with model: ${input.modelId}`);
		const { text, pageCount } = await this.runOcr(
			service,
			resolvedPath,
			fileBuffer,
			input.modelId,
			signal
		);
		this.logger?.info(
			OcrTaskHandler.LOG_SOURCE,
			`OCR returned ${text.length} characters across ${pageCount} page(s)`
		);

		reporter.progress(80, 'Saving result');
		OcrTaskHandler.throwIfAborted(signal);

		const savedPath = await this.saveResult(workspace, contentsService, resolvedPath, text);
		this.logger?.info(OcrTaskHandler.LOG_SOURCE, `Result saved to: ${savedPath}`);

		reporter.progress(100, 'OCR complete');

		return {
			text,
			filePath: input.url,
			pageCount,
			savedPath,
		};
	}

	private async runOcr(
		service: Service,
		filePath: string,
		fileBuffer: Buffer,
		model: string,
		signal: AbortSignal
	): Promise<{ text: string; pageCount: number }> {
		const client = new MistralOcrClient(service.apiKey, this.logger);
		const base64 = fileBuffer.toString('base64');
		const mimeType = this.detectMimeType(filePath);

		const document = mimeType.startsWith('image/')
			? ({ type: 'image_base64', data: base64, mimeType } as const)
			: ({ type: 'document_base64', data: base64, mimeType } as const);

		try {
			const result = await client.process({ document, model, signal });
			const text = result.pages.map((page) => page.markdown).join('\n\n');
			return { text, pageCount: result.pages.length };
		} catch (err) {
			this.logger?.error(OcrTaskHandler.LOG_SOURCE, 'OCR processing failed', {
				model,
				filePath,
				mimeType,
				error: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack : undefined,
			});
			throw err;
		}
	}

	private static throwIfAborted(signal: AbortSignal): void {
		if (signal.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}
	}

	private detectMimeType(filePath: string): string {
		const ext = path.extname(filePath).toLowerCase();
		switch (ext) {
			case '.pdf':
				return 'application/pdf';
			case '.png':
				return 'image/png';
			case '.jpg':
			case '.jpeg':
				return 'image/jpeg';
			case '.webp':
				return 'image/webp';
			case '.gif':
				return 'image/gif';
			default:
				return 'application/octet-stream';
		}
	}

	private async saveResult(
		workspace: Workspace,
		contentsService: ContentsService,
		sourcePath: string,
		text: string
	): Promise<string> {
		const workspacePath = workspace.getCurrent();
		if (!workspacePath) {
			throw new Error('No active workspace to save OCR result');
		}

		await contentsService.ensureContentsDir(workspacePath);
		const contentsDir = contentsService.getContentsDir(workspacePath);

		const baseName = path.basename(sourcePath, path.extname(sourcePath));
		const destPath = path.join(contentsDir, `${baseName}.md`);
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

	private resolveContentsService(input: OcrTaskInput): ContentsService {
		if (typeof input.windowId !== 'number') {
			throw new Error('OcrTaskInput.windowId is required to resolve contents service');
		}

		const windowContext = this.windowContextManager.tryGet(input.windowId);
		if (!windowContext) {
			throw new Error(`No window context found for windowId ${input.windowId}`);
		}

		if (!windowContext.container.has('contentsService')) {
			throw new Error(`No contents service available for windowId ${input.windowId}`);
		}

		return windowContext.container.get<ContentsService>('contentsService');
	}
}
