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
 *   handler enters       → task `queued` then `started`
 *   agent `text` delta   → task `running: <token>`
 *   agent return value   → task `finished: <full content>`
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

		const logAndEmit: Emit = (update) => {
			if (update.state !== 'running') {
				const payload =
					update.state === 'finished' ? `length=${update.data.length}` : update.data;
				logger.info(LOG_SOURCE, `state=${update.state}`, { data: payload });
			}
			emit(update);
		};

		logAndEmit({ state: 'queued', data: 'queued' });
		logAndEmit({ state: 'started', data: 'started' });

		const service = serviceResolver.resolve(
			input.providerId ? { providerId: input.providerId } : undefined
		);
		const model = modelResolver.resolve(input.modelId ? { modelId: input.modelId } : undefined);

		const agentInput: ContentWriterAgentInput = {
			prompt: input.prompt,
			providerId: service.provider.id,
			apiKey: service.apiKey,
			modelName: model.modelId,
		};

		const onEvent = (event: AgentEvent): void => {
			if (event.kind === 'text') {
				const token = (event.payload as { text: string }).text;
				logAndEmit({ state: 'running', data: token });
			}
		};

		const output: ContentWriterAgentOutput = await agent.execute(agentInput, {
			signal,
			logger,
			onEvent,
		});

		logAndEmit({ state: 'finished', data: output.content });

		return output.content;
	}
}
