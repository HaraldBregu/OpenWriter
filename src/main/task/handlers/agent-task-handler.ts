import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext, AgentEvent } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { StoreService } from '../../services/store';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { SkillsStoreService } from '../../services/skills-store-service';
import type { Skill } from '../../agents/skills';
import type { AgentCompletedOutput } from '../../../shared/types';

/**
 * AgentTaskHandler — bridges the task system to the agent registry.
 *
 * Enriches the incoming payload with `{ providerId, apiKey, modelName }`
 * resolved from store settings, then dispatches to the registered agent.
 * Streaming tokens flow through `recordEvent` as `delta` events
 * ({ token, fullContent }) for live editor insertion.
 */

export interface AgentTaskInput<TAgentInput = unknown> {
	agentType: string;
	input: TAgentInput;
}

const LOG_SOURCE = 'AgentTaskHandler';
const PROGRESS_RAMP_K = 0.5;
const PROGRESS_RAMP_CAP = 99;

interface AgentInputRecord {
	providerId?: string;
	apiKey?: string;
	modelName?: string;
	skills?: Skill[];
	[key: string]: unknown;
}

const WRITER_AGENT_TYPE = 'writer';

interface AgentRunOutput {
	content?: unknown;
	stoppedReason?: unknown;
}

export class AgentTaskHandler implements TaskHandler<AgentTaskInput, AgentCompletedOutput> {
	readonly type = 'agent';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver: ServiceResolver,
		private readonly storeService: StoreService,
		private readonly modelResolver: ModelResolver,
		private readonly skillsStoreService?: SkillsStoreService
	) {}

	validate(input: AgentTaskInput): void {
		if (!input?.agentType?.trim()) {
			throw new Error('agent task requires agentType');
		}
		if (!this.agents.has(input.agentType)) {
			throw new Error(`Unknown agent type: ${input.agentType}`);
		}
		if (input.input === undefined || input.input === null) {
			throw new Error('agent task requires input');
		}
	}

	async execute(
		input: AgentTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<AgentCompletedOutput> {
		const agent = this.agents.get(input.agentType);
		const startedAt = Date.now();
		const enrichedInput = await this.enrichInput(input.agentType, input.input);

		this.logTaskStart(input.agentType, enrichedInput, metadata);

		let tokens = 0;
		let fullContent = '';

		reporter.progress(0, 'reasoning');

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			metadata,
			progress: (percent, message) => {
				reporter.progress(percent, message);
			},
			onEvent: (event: AgentEvent) => {
				console.log(event)
				if (event.kind === 'text') {
					const delta = extractTextDelta(event.payload);
					if (delta) {
						tokens += 1;
						fullContent += delta;
						reporter.progress(rampPct(tokens), 'response');
						process.stdout.write(delta);
						recordEvent?.({
							kind: 'delta',
							at: Date.now(),
							payload: { token: delta, fullContent },
						});
						return;
					}
				}

				recordEvent?.(event);
			},
		};

		try {
			const raw = (await agent.execute(enrichedInput, ctx)) as AgentRunOutput;
			const content = typeof raw?.content === 'string' ? raw.content : fullContent;
			const stoppedReason = resolveStoppedReason(raw?.stoppedReason);
			reporter.progress(100, 'done');
			this.logger.info(LOG_SOURCE, `[${input.agentType}] completed`, {
				elapsedMs: Date.now() - startedAt,
				tokens,
				contentLength: content.length,
				stoppedReason,
			});
			return { content, stoppedReason };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const level = err.name === 'AbortError' ? 'warn' : 'error';
			this.logger[level](LOG_SOURCE, `[${input.agentType}] failed`, {
				elapsedMs: Date.now() - startedAt,
				error: err.message,
				name: err.name,
			});
			throw error;
		}
	}

	private logTaskStart(
		agentType: string,
		enriched: unknown,
		metadata?: Record<string, unknown>
	): void {
		const record = (enriched ?? {}) as AgentInputRecord;
		this.logger.info(LOG_SOURCE, `[${agentType}] started`, {
			providerId: record.providerId,
			modelName: record.modelName,
			metadataKeys: metadata ? Object.keys(metadata) : [],
		});
	}

	private enrichInput<T>(agentType: string, raw: T): T {
		if (!raw || typeof raw !== 'object') return raw;

		const base = raw as AgentInputRecord;
		const agentSettings = this.storeService.getAgentById(agentType);
		const model = this.modelResolver.resolve({
			modelId: base.modelName?.trim() || agentSettings?.models.text,
		});
		const providerId = base.providerId?.trim() || model.providerId;
		const service = this.serviceResolver.resolve({ providerId });

		return {
			...base,
			providerId: service.provider.id,
			apiKey: base.apiKey?.trim() || service.apiKey,
			modelName: model.modelId,
		} as unknown as T;
	}
}

function extractTextDelta(payload: unknown): string {
	if (!payload || typeof payload !== 'object') return '';
	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? text : '';
}

function rampPct(tokens: number): number {
	return Math.min(PROGRESS_RAMP_CAP, Math.round(tokens * PROGRESS_RAMP_K));
}

function resolveStoppedReason(raw: unknown): AgentCompletedOutput['stoppedReason'] {
	if (raw === 'done' || raw === 'max-steps' || raw === 'stagnation') return raw;
	return 'done';
}
