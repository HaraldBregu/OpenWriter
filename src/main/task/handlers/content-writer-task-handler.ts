import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type {
	ContentWriterAgent,
	ContentWriterAgentInput,
	ContentWriterAgentOutput,
	ContentWriterRoute,
	ContentWriterRouting,
	ContentWriterState,
} from '../../agents/content-writer';
import type { AgentEvent } from '../../agents/core/agent';

export interface ContentWriterTaskInput {
	prompt: string;
	/** Existing text — required only when the router picks the "grammar" path. */
	existingText?: string;
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

const ROUTE_LABELS: Record<ContentWriterRoute, string> = {
	short: 'Drafting short copy...',
	grammar: 'Polishing grammar...',
	long: 'Drafting long-form content...',
};

/**
 * Task handler that drives the ContentWriterAgent and translates its
 * AgentEvents into TaskEvents for the renderer.
 *
 * Event mapping:
 *   agent `state{routing}`     → task `started: 'Routing prompt...'`
 *   agent `route`              → task `started: 'Route: <route>'`
 *   agent `state{generating}`  → task `started: '<route-specific label>'`
 *   agent `text`               → task `running: <token>`
 *   agent return value         → task `finished: <full content>`
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
			existingText: input.existingText,
		};

		const onEvent = (event: AgentEvent): void => {
			if (event.kind === 'state') {
				const phase = (event.payload as ContentWriterState).phase;
				if (phase === 'routing') {
					logAndEmit({ state: 'started', data: 'Routing prompt...' });
				} else if (phase === 'generating') {
					const route = (event.payload as ContentWriterState).route;
					logAndEmit({
						state: 'started',
						data: route ? ROUTE_LABELS[route] : 'Generating...',
					});
				}
				return;
			}
			if (event.kind === 'route') {
				const routing = event.payload as ContentWriterRouting;
				logAndEmit({ state: 'started', data: `Route: ${routing.route}` });
				return;
			}
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
