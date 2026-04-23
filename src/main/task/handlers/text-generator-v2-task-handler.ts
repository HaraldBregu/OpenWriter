import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext, AgentEvent } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { StreamLoggerService } from '../../services/stream-logger';
import type {
	TextGeneratorV2AgentInput,
	TextGeneratorV2AgentOutput,
} from '../../agents/text-generator-v2';
import { DEFAULT_TEXT_MODEL_ID } from '../../../shared/models';
import type { AgentCompletedOutput } from '../../../shared/types';
import { getTaskExecutionContext } from '../task-execution-context';

export interface TextGeneratorV2TaskInput {
	raw: string;
	skillIds?: Record<string, string>;
	skillIdRegistryPath?: string;
	providerId?: string;
	apiKey?: string;
	modelName?: string;
	perCallTimeoutMs?: number;
	stream?: boolean;
}

const LOG_SOURCE = 'TextGeneratorV2TaskHandler';
const AGENT_TYPE = 'text-generator-v2';
const HANDLER_TYPE = 'text-generator-v2';

export class TextGeneratorV2TaskHandler
	implements TaskHandler<TextGeneratorV2TaskInput, AgentCompletedOutput>
{
	readonly type = HANDLER_TYPE;

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver: ServiceResolver,
		private readonly modelResolver: ModelResolver,
		private readonly streamLogger?: StreamLoggerService
	) {}

	validate(input: TextGeneratorV2TaskInput): void {
		if (!input) {
			throw new Error('text-generator-v2 task requires input');
		}
		if (!input.raw?.trim()) {
			throw new Error('text-generator-v2 task requires non-empty raw input');
		}
		if (!this.agents.has(AGENT_TYPE)) {
			throw new Error(`${AGENT_TYPE} agent is not registered`);
		}
	}

	async execute(
		input: TextGeneratorV2TaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<AgentCompletedOutput> {
		const startedAt = Date.now();
		const agent = this.agents.get<TextGeneratorV2AgentInput, TextGeneratorV2AgentOutput>(
			AGENT_TYPE
		);
		const agentInput = this.buildAgentInput(input);
		const taskId = getTaskExecutionContext()?.taskId;

		this.logger.info(LOG_SOURCE, `[${AGENT_TYPE}] task started`, {
			providerId: agentInput.providerId,
			modelName: agentInput.modelName,
			hasSkillIds: Boolean(agentInput.skillIds),
			hasRegistryPath: Boolean(agentInput.skillIdRegistryPath),
			stream: agentInput.stream,
			metadataKeys: metadata ? Object.keys(metadata) : [],
		});

		if (taskId) {
			this.streamLogger?.open(taskId, {
				streamType: 'text-generation',
				agentType: AGENT_TYPE,
				metadata,
			});
		}

		reporter.progress(0, 'parsing');

		let tokens = 0;
		let fullContent = '';

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			metadata,
			progress: (percent, message) => reporter.progress(percent, message),
			onEvent: (event: AgentEvent) => {
				if (event.kind === 'text') {
					const delta = extractTextDelta(event.payload);
					if (delta) {
						tokens += 1;
						fullContent += delta;
						const deltaEvent: AgentEvent = {
							kind: 'delta',
							at: Date.now(),
							payload: { token: delta, fullContent },
						};
						if (taskId) this.streamLogger?.logEvent(taskId, deltaEvent);
						recordEvent?.(deltaEvent);
						return;
					}
				}
				if (taskId) this.streamLogger?.logEvent(taskId, event);
				recordEvent?.(event);
			},
		};

		try {
			const output = await agent.execute(agentInput, ctx);
			const content = output.finalDocument;
			reporter.progress(100, 'done');

			this.logger.info(LOG_SOURCE, `[${AGENT_TYPE}] task completed`, {
				elapsedMs: Date.now() - startedAt,
				intent: output.intent,
				target: output.target,
				skills: output.selectedSkillNames,
				skillIds: output.selectedSkillIds.length,
				tokens,
				contentLength: content.length,
			});

			if (taskId) {
				this.streamLogger?.close(taskId, {
					status: 'completed',
					stoppedReason: 'done',
					tokens,
					contentLength: content.length,
				});
			}

			return { content, stoppedReason: 'done' };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const level = err.name === 'AbortError' ? 'warn' : 'error';
			this.logger[level](LOG_SOURCE, `[${AGENT_TYPE}] task failed`, {
				elapsedMs: Date.now() - startedAt,
				error: err.message,
				name: err.name,
			});
			if (taskId) {
				this.streamLogger?.close(taskId, {
					status: err.name === 'AbortError' ? 'cancelled' : 'error',
					error: err.message,
					tokens,
					contentLength: fullContent.length,
				});
			}
			throw error;
		}
	}

	private buildAgentInput(input: TextGeneratorV2TaskInput): TextGeneratorV2AgentInput {
		const modelId = input.modelName?.trim() || DEFAULT_TEXT_MODEL_ID;
		const model = this.modelResolver.resolve({ modelId });
		const providerId = input.providerId?.trim() || model.providerId;
		const service = this.serviceResolver.resolve({ providerId });

		return {
			raw: input.raw,
			providerId: service.provider.id,
			apiKey: input.apiKey?.trim() || service.apiKey,
			modelName: model.modelId,
			stream: input.stream ?? true,
			...(input.skillIds && Object.keys(input.skillIds).length > 0
				? { skillIds: input.skillIds }
				: {}),
			...(input.skillIdRegistryPath?.trim()
				? { skillIdRegistryPath: input.skillIdRegistryPath.trim() }
				: {}),
			...(input.perCallTimeoutMs != null ? { perCallTimeoutMs: input.perCallTimeoutMs } : {}),
		};
	}
}

function extractTextDelta(payload: unknown): string {
	if (!payload || typeof payload !== 'object') return '';
	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? text : '';
}
