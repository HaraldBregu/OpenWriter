import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext, AgentEvent } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { StreamLoggerService } from '../../services/stream-logger';
import type {
	TextGeneratorV1AgentInput,
	TextGeneratorV1AgentOutput,
} from '../../agents/text-generator-v1';
import { DEFAULT_TEXT_MODEL_ID } from '../../../shared/models';
import type { AgentCompletedOutput } from '../../../shared/types';
import { getTaskExecutionContext } from '../task-execution-context';

/**
 * TextGeneratorV1TaskHandler — dedicated task handler for the editor agent.
 *
 * Accepts structured editing input (`<selected_text>...` / `<prompt>...` tags
 * embedded in `raw`), enriches provider/model configuration, and dispatches to
 * the `text-generator-v1` agent. Text deltas from the agent are re-emitted as
 * `delta` events for live editor insertion. Final merged document is returned
 * as `content` in the standard `AgentCompletedOutput` envelope.
 */

export interface TextGeneratorV1TaskInput {
	/** Raw document possibly containing `<selected_text>` and `<prompt>` tags. */
	raw: string;
	/** Skill name → uploaded skill_id map (for OpenAI Skills references). */
	skillIds?: Record<string, string>;
	/** Path to a JSON file holding a `{ name: skill_id }` map. Used if `skillIds` absent. */
	skillIdRegistryPath?: string;
	providerId?: string;
	apiKey?: string;
	modelName?: string;
	/** Per-LLM-call timeout in ms. */
	perCallTimeoutMs?: number;
	/** Stream text deltas as they arrive. Default true. */
	stream?: boolean;
}

const LOG_SOURCE = 'TextGeneratorV1TaskHandler';
const AGENT_TYPE = 'text-generator-v1';
const HANDLER_TYPE = 'text-generator-v1';

export class TextGeneratorV1TaskHandler
	implements TaskHandler<TextGeneratorV1TaskInput, AgentCompletedOutput>
{
	readonly type = HANDLER_TYPE;

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver: ServiceResolver,
		private readonly modelResolver: ModelResolver,
		private readonly streamLogger?: StreamLoggerService
	) {}

	validate(input: TextGeneratorV1TaskInput): void {
		if (!input) {
			throw new Error('text-generator-v1 task requires input');
		}
		if (!input.raw?.trim()) {
			throw new Error('text-generator-v1 task requires non-empty raw input');
		}
		if (!this.agents.has(AGENT_TYPE)) {
			throw new Error(`${AGENT_TYPE} agent is not registered`);
		}
	}

	async execute(
		input: TextGeneratorV1TaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<AgentCompletedOutput> {
		const startedAt = Date.now();
		const agent = this.agents.get<TextGeneratorV1AgentInput, TextGeneratorV1AgentOutput>(
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
			// Return the direct model output, not the merged full document.
			// The editor UX (editorInsert.commitFinal) replaces the selection
			// range with this content — the merged document would duplicate text.
			const content = output.rawResult;
			reporter.progress(100, 'done');

			this.logger.info(LOG_SOURCE, `[${AGENT_TYPE}] task completed`, {
				elapsedMs: Date.now() - startedAt,
				intent: output.intent,
				target: output.target,
				skills: output.selectedSkillNames,
				skillIds: output.selectedSkillIds.length,
				tokens,
				contentLength: content.length,
				finalDocumentLength: output.finalDocument.length,
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

	private buildAgentInput(input: TextGeneratorV1TaskInput): TextGeneratorV1AgentInput {
		// Model is resolved ONLY to discover providerId + apiKey. The agent's own
		// default (`gpt-5.2`) applies when the caller does not pass `modelName`,
		// because shell+skills require a reasoning-class model.
		const modelId = input.modelName?.trim() || DEFAULT_TEXT_MODEL_ID;
		const model = this.modelResolver.resolve({ modelId });
		const providerId = input.providerId?.trim() || model.providerId;
		const service = this.serviceResolver.resolve({ providerId });

		return {
			raw: input.raw,
			providerId: service.provider.id,
			apiKey: input.apiKey?.trim() || service.apiKey,
			stream: input.stream ?? true,
			...(input.modelName?.trim() ? { modelName: input.modelName.trim() } : {}),
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
