import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext, AgentEvent } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { StreamLoggerService } from '../../services/stream-logger';
import { DEFAULT_IMAGE_MODEL_ID } from '../../../shared/models';
import { getTaskExecutionContext } from '../task-execution-context';

/**
 * ImageGeneratorTaskHandler — dedicated task handler for prompt → image.
 *
 * Dispatches to the `image-generator` agent registered in AgentRegistry. The
 * agent itself is intentionally not implemented yet; this handler provides
 * the task-system contract and stream-logging wiring so the agent can drop
 * in without touching the task layer.
 *
 * Stream events are forwarded to StreamLoggerService tagged as
 * `image-generation` for debug tracing (see stream-logger.ts).
 */

export type ImageResponseFormat = 'url' | 'b64_json';

export type ImageSize =
	| '256x256'
	| '512x512'
	| '1024x1024'
	| '1024x1536'
	| '1536x1024'
	| '1024x1792'
	| '1792x1024'
	| 'auto';

export type ImageQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto';

export type ImageStyle = 'vivid' | 'natural';

export interface ImageGeneratorTaskInput {
	/** Text prompt describing the image to generate. Required. */
	prompt: string;
	size?: ImageSize;
	quality?: ImageQuality;
	style?: ImageStyle;
	/** Number of images to generate. Defaults to 1. */
	n?: number;
	responseFormat?: ImageResponseFormat;
	providerId?: string;
	apiKey?: string;
	modelName?: string;
}

export interface GeneratedImage {
	url?: string;
	b64?: string;
	revisedPrompt?: string;
}

export interface ImageGeneratorTaskOutput {
	images: GeneratedImage[];
	stoppedReason: 'done';
}

/**
 * Shape the image-generator agent is expected to accept once implemented.
 * Mirrors the enriched input built by `buildAgentInput`.
 */
export interface ImageGeneratorAgentInput extends ImageGeneratorTaskInput {
	providerId: string;
	apiKey: string;
	modelName: string;
}

interface ImageGeneratorAgentOutput {
	images?: GeneratedImage[];
}

const LOG_SOURCE = 'ImageGeneratorTaskHandler';
const AGENT_TYPE = 'image-generator';

export class ImageGeneratorTaskHandler
	implements TaskHandler<ImageGeneratorTaskInput, ImageGeneratorTaskOutput>
{
	readonly type = 'image-generator';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver: ServiceResolver,
		private readonly modelResolver: ModelResolver,
		private readonly streamLogger?: StreamLoggerService
	) {}

	validate(input: ImageGeneratorTaskInput): void {
		if (!input?.prompt?.trim()) {
			throw new Error('image-generator task requires a non-empty prompt');
		}
		if (input.n != null && (!Number.isInteger(input.n) || input.n < 1)) {
			throw new Error('image-generator task n must be a positive integer');
		}
		if (!this.agents.has(AGENT_TYPE)) {
			throw new Error('image-generator agent is not registered');
		}
	}

	async execute(
		input: ImageGeneratorTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<ImageGeneratorTaskOutput> {
		const startedAt = Date.now();
		const agent = this.agents.get<ImageGeneratorAgentInput, ImageGeneratorAgentOutput>(AGENT_TYPE);
		const agentInput = this.buildAgentInput(input);
		const taskId = getTaskExecutionContext()?.taskId;

		this.logger.info(LOG_SOURCE, 'Image generation task started', {
			providerId: agentInput.providerId,
			modelName: agentInput.modelName,
			n: agentInput.n ?? 1,
			size: agentInput.size,
			metadataKeys: metadata ? Object.keys(metadata) : [],
		});

		if (taskId) {
			this.streamLogger?.open(taskId, {
				streamType: 'image-generation',
				agentType: AGENT_TYPE,
				metadata,
			});
		}

		reporter.progress(0, 'preparing');

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			metadata,
			progress: (percent, message) => reporter.progress(percent, message),
			onEvent: (event: AgentEvent) => {
				if (taskId) this.streamLogger?.logEvent(taskId, event);
				recordEvent?.(event);
			},
		};

		try {
			const output = await agent.execute(agentInput, ctx);
			const images = Array.isArray(output?.images) ? output.images : [];
			reporter.progress(100, 'done');
			this.logger.info(LOG_SOURCE, 'Image generation task completed', {
				elapsedMs: Date.now() - startedAt,
				imageCount: images.length,
			});
			if (taskId) {
				this.streamLogger?.close(taskId, {
					status: 'completed',
					stoppedReason: 'done',
				});
			}
			return { images, stoppedReason: 'done' };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const level = err.name === 'AbortError' ? 'warn' : 'error';
			this.logger[level](LOG_SOURCE, 'Image generation task failed', {
				elapsedMs: Date.now() - startedAt,
				error: err.message,
				name: err.name,
			});
			if (taskId) {
				this.streamLogger?.close(taskId, {
					status: err.name === 'AbortError' ? 'cancelled' : 'error',
					error: err.message,
				});
			}
			throw error;
		}
	}

	private buildAgentInput(input: ImageGeneratorTaskInput): ImageGeneratorAgentInput {
		const modelId = input.modelName?.trim() || DEFAULT_IMAGE_MODEL_ID;
		const model = this.modelResolver.resolve({ modelId });
		const providerId = input.providerId?.trim() || model.providerId;
		const service = this.serviceResolver.resolve({ providerId });

		return {
			...input,
			providerId: service.provider.id,
			apiKey: input.apiKey?.trim() || service.apiKey,
			modelName: model.modelId,
		};
	}
}
