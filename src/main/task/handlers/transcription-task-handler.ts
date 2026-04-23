import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext, AgentEvent } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type {
	TranscriptionAgentInput,
	TranscriptionAgentOutput,
	TranscriptionResponseFormat,
} from '../../agents/transcription';
import { DEFAULT_TRANSCRIPTION_MODEL_ID } from '../../../shared/models';
import type { AgentCompletedOutput } from '../../../shared/types';

/**
 * Input accepted by TranscriptionTaskHandler. Exactly one of `filePath` or
 * `base64` must be provided.
 */
export interface TranscriptionTaskInput {
	/** Absolute path to an audio or video file on disk. */
	filePath?: string;
	/** Base64-encoded bytes. Requires `fileName` and `mimeType`. */
	base64?: string;
	fileName?: string;
	mimeType?: string;
	language?: string;
	prompt?: string;
	responseFormat?: TranscriptionResponseFormat;
	temperature?: number;
	providerId?: string;
	apiKey?: string;
	modelName?: string;
}

const LOG_SOURCE = 'TranscriptionTaskHandler';
const AGENT_TYPE = 'transcription';

/**
 * TranscriptionTaskHandler — dedicated task handler for audio/video → text.
 *
 * Accepts a file path (preferred) or base64 bytes, enriches provider/model
 * configuration from the settings store, and dispatches to TranscriptionAgent.
 * The final transcript streams out as a single `delta` event for live insert,
 * matching the contract used by AgentTaskHandler.
 */
export class TranscriptionTaskHandler
	implements TaskHandler<TranscriptionTaskInput, AgentCompletedOutput>
{
	readonly type = 'transcription';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver: ServiceResolver,
		private readonly modelResolver: ModelResolver
	) {}

	validate(input: TranscriptionTaskInput): void {
		if (!input) {
			throw new Error('transcription task requires input');
		}
		const hasFile = !!input.filePath?.trim();
		const hasBase64 = !!input.base64?.trim();
		if (hasFile === hasBase64) {
			throw new Error('transcription task requires exactly one of filePath or base64');
		}
		if (hasBase64 && (!input.fileName?.trim() || !input.mimeType?.trim())) {
			throw new Error('base64 input requires fileName and mimeType');
		}
		if (!this.agents.has(AGENT_TYPE)) {
			throw new Error(`transcription agent is not registered`);
		}
	}

	async execute(
		input: TranscriptionTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<AgentCompletedOutput> {
		const startedAt = Date.now();
		const agent = this.agents.get<TranscriptionAgentInput, TranscriptionAgentOutput>(AGENT_TYPE);
		const agentInput = this.buildAgentInput(input);

		this.logger.info(LOG_SOURCE, 'Transcription task started', {
			providerId: agentInput.providerId,
			modelName: agentInput.modelName,
			sourceKind: agentInput.sourceKind,
			metadataKeys: metadata ? Object.keys(metadata) : [],
		});

		reporter.progress(0, 'preparing');

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			metadata,
			progress: (percent, message) => reporter.progress(percent, message),
			onEvent: (event: AgentEvent) => {
				if (event.kind === 'text') {
					const text = extractText(event.payload);
					if (text) {
						recordEvent?.({
							kind: 'delta',
							at: Date.now(),
							payload: { token: text, fullContent: text },
						});
						return;
					}
				}
				recordEvent?.(event);
			},
		};

		try {
			const output = await agent.execute(agentInput, ctx);
			reporter.progress(100, 'done');
			this.logger.info(LOG_SOURCE, 'Transcription task completed', {
				elapsedMs: Date.now() - startedAt,
				characters: output.text.length,
				language: output.language,
				duration: output.duration,
			});
			return { content: output.text, stoppedReason: 'done' };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const level = err.name === 'AbortError' ? 'warn' : 'error';
			this.logger[level](LOG_SOURCE, 'Transcription task failed', {
				elapsedMs: Date.now() - startedAt,
				error: err.message,
				name: err.name,
			});
			throw error;
		}
	}

	private buildAgentInput(input: TranscriptionTaskInput): TranscriptionAgentInput {
		const modelId = input.modelName?.trim() || DEFAULT_TRANSCRIPTION_MODEL_ID;
		const model = this.modelResolver.resolve({ modelId });
		const providerId = input.providerId?.trim() || model.providerId;
		const service = this.serviceResolver.resolve({ providerId });

		const shared = {
			providerId: service.provider.id,
			apiKey: input.apiKey?.trim() || service.apiKey,
			modelName: model.modelId,
			...(input.language ? { language: input.language } : {}),
			...(input.prompt ? { prompt: input.prompt } : {}),
			...(input.responseFormat ? { responseFormat: input.responseFormat } : {}),
			...(input.temperature != null ? { temperature: input.temperature } : {}),
		};

		if (input.filePath?.trim()) {
			return {
				...shared,
				source: input.filePath.trim(),
				sourceKind: 'file',
			};
		}

		return {
			...shared,
			source: input.base64!,
			sourceKind: 'base64',
			fileName: input.fileName,
			mimeType: input.mimeType,
		};
	}
}

function extractText(payload: unknown): string {
	if (!payload || typeof payload !== 'object') return '';
	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? text : '';
}
