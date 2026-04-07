import path from 'node:path';
import type { TaskHandler, ProgressReporter } from '../task-handler';
import type { ProviderResolver } from '../../shared/provider-resolver';
import type { LoggerService } from '../../services/logger';
import type { WindowContextManager } from '../../core/window-context';
import {
	createVisionAgent,
	generateImage,
 } from '../../agents/image/image-generation';
import type { VisionSize, VisionQuality, VisionFormat } from '../../agents/image/types';

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface VisionTaskInput {
	prompt: string;
	providerId?: string;
	size?: VisionSize;
	quality?: VisionQuality;
	format?: VisionFormat;
	windowId?: number;
	workspacePath?: string;
}

export interface VisionTaskOutput {
	filePath: string;
	fileName: string;
	localUrl: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class VisionTaskHandler implements TaskHandler<VisionTaskInput, VisionTaskOutput> {
	readonly type = 'vision';

	constructor(
		private readonly providerResolver: ProviderResolver,
		private readonly windowContextManager: WindowContextManager,
		private readonly logger?: LoggerService
	) {}

	validate(input: VisionTaskInput): void {
		if (!input?.prompt || typeof input.prompt !== 'string' || input.prompt.trim().length === 0) {
			throw new Error('VisionTaskInput.prompt must be a non-empty string');
		}
	}

	async execute(
		input: VisionTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		_streamReporter?: unknown,
		metadata?: Record<string, unknown>
	): Promise<VisionTaskOutput> {
		reporter.progress(5, 'Resolving provider...');

		const provider = this.providerResolver.resolve({
			providerId: input.providerId ?? 'openai',
		});

		reporter.progress(15, 'Generating image...');

		const agent = createVisionAgent({
			apiKey: provider.apiKey,
			url: provider.baseUrl,
			size: input.size,
			quality: input.quality,
			format: input.format,
		});

		const workspacePath = this.resolveWorkspacePath(input, metadata);

		let result: GeneratedImage;
		try {
			result = await generateImage({
				agent,
				prompt: input.prompt,
				signal,
				metadata,
				workspacePath,
				logger: this.logger,
			});
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger?.error('VisionTaskHandler', `Image generation failed: ${message}`);
			throw error;
		}

		reporter.progress(100, 'Image generated.');

		return {
			filePath: result.filePath,
			fileName: result.fileName,
			localUrl: result.localUrl,
		};
	}

	private resolveWorkspacePath(
		input: VisionTaskInput,
		metadata?: Record<string, unknown>
	): string | undefined {
		const windowContext =
			typeof input.windowId === 'number'
				? this.windowContextManager.tryGet(input.windowId)
				: undefined;

		const fromService = windowContext?.container.has('workspace')
			? windowContext.container
					.get<import('../../workspace/workspace-service').WorkspaceService>('workspace')
					.getCurrent()
			: undefined;
		if (fromService) return fromService;

		if (typeof input.workspacePath === 'string' && input.workspacePath.trim().length > 0) {
			return path.resolve(input.workspacePath);
		}

		return typeof metadata?.workspacePath === 'string' && metadata.workspacePath.trim().length > 0
			? path.resolve(metadata.workspacePath)
			: undefined;
	}
}
