import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type {
	ContentWriterAgent,
	ContentWriterAgentInput,
	ContentWriterAgentOutput,
} from '../../agents/content-writer';
import type { AgentEvent } from '../../agents/core/agent';
import type { TaskState } from '../../../shared/types';

export interface ContentWriterTaskInput {
	prompt: string;
	/** Optional overrides; default to whatever ServiceResolver/ModelResolver pick. */
	providerId?: string;
	modelId?: string;
}

export interface ContentWriterTaskHandlerDeps {
	agent: ContentWriterAgent;
	serviceResolver: ServiceResolver;
	modelResolver: ModelResolver;
	logger: LoggerService;
}

const LOG_SOURCE = 'ContentWriterTaskHandler';

/**
 * Task handler that drives the ContentWriterAgent and translates its
 * AgentEvents into TaskEvents for the renderer.
 *
 * Event mapping:
 *   handler enters       → task `queued` / `started` ({success: true, data})
 *   agent `text` delta   → task `running: <token>` ({success: true, data})
 *   agent return value   → task `finished: <content>` ({success: true, data})
 *
 * Error path: caught errors are logged here and rethrown. The executor
 * emits the resulting `cancelled` event with `{success: false, error: <message>}`,
 * so we don't double-emit from the handler.
 */
export class ContentWriterTaskHandler
	implements TaskHandler<ContentWriterTaskInput, string>
{
	readonly type = 'content-writer';

	constructor(private readonly deps: ContentWriterTaskHandlerDeps) {}

	async execute(
		input: ContentWriterTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		const { agent, serviceResolver, modelResolver, logger } = this.deps;

		logger.info(LOG_SOURCE, 'Content-writer task started', {
			promptLength: input.prompt.length,
		});

		const logAndEmitSuccess = (update: { state: TaskState; data: string }): void => {
			if (update.state !== 'running') {
				const payload =
					update.state === 'finished' ? `length=${update.data.length}` : update.data;
				logger.info(LOG_SOURCE, `state=${update.state}`, { data: payload });
			}
			emit({ state: update.state, data: { success: true, data: update.data } });
		};

		logAndEmitSuccess({ state: 'queued', data: 'queued' });
		logAndEmitSuccess({ state: 'started', data: 'started' });

		try {
			const service = serviceResolver.resolve(
				input.providerId ? { providerId: input.providerId } : undefined
			);
			const model = modelResolver.resolve(
				input.modelId ? { modelId: input.modelId } : undefined
			);

			const agentInput: ContentWriterAgentInput = {
				prompt: input.prompt,
				providerId: service.provider.id,
				apiKey: service.apiKey,
				modelName: model.modelId,
			};

			const onEvent = (event: AgentEvent): void => {
				if (event.kind === 'text') {
					const token = (event.payload as { text: string }).text;
					logAndEmitSuccess({ state: 'running', data: token });
				}
			};

			const output: ContentWriterAgentOutput = await agent.execute(agentInput, {
				signal,
				logger,
				onEvent,
			});

			logAndEmitSuccess({ state: 'finished', data: output.content });

			return output.content;
		} catch (err) {
			// Aborts are user-initiated, not errors — log neutrally.
			// `DOMException` is not always an `Error` subclass under the test
			// runtime, so check the name property directly rather than via
			// `instanceof`.
			const name =
				err && typeof err === 'object' ? (err as { name?: unknown }).name : undefined;
			if (name === 'AbortError') {
				logger.info(LOG_SOURCE, 'Content-writer task aborted');
				throw err;
			}

			const message = err instanceof Error ? err.message : String(err);
			logger.error(LOG_SOURCE, 'Content-writer task failed', { error: message });
			throw err;
		}
	}
}
