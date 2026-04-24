import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../services/logger';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext } from '../../agents/core/agent';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { AssistantAgentInput, AssistantAgentOutput } from '../../agents/assistant';

const LOG_SOURCE = 'AgentTaskHandler';
const ASSISTANT_AGENT_TYPE = 'assistant';

export interface AgentTaskInput {
	prompt: string;
	providerId?: string;
	modelId?: string;
	temperature?: number;
	maxTokens?: number;
}

/**
 * Bridge task handler that dispatches a prompt to the registered `assistant`
 * agent. Server-side resolves provider credentials + model so the renderer
 * only sends a prompt.
 */
export class AgentTaskHandler implements TaskHandler<AgentTaskInput, string> {
	readonly type = 'agent-text';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly services: ServiceResolver,
		private readonly models: ModelResolver,
		private readonly logger?: LoggerService
	) {}

	validate(input: AgentTaskInput): void {
		if (!input || typeof input !== 'object') {
			throw new Error('AgentTaskHandler: input must be an object');
		}
		if (typeof input.prompt !== 'string' || input.prompt.trim().length === 0) {
			throw new Error('AgentTaskHandler: prompt is required');
		}
	}

	async execute(input: AgentTaskInput, signal: AbortSignal, emit: Emit): Promise<string> {
		const service = this.services.resolve({ providerId: input.providerId });
		const model = this.models.resolve({ modelId: input.modelId });

		const agentInput: AssistantAgentInput = {
			prompt: input.prompt,
			providerId: service.provider.id,
			apiKey: service.apiKey,
			modelName: model.modelName,
			temperature: input.temperature,
			maxTokens: input.maxTokens,
		};

		const ctx: AgentContext = {
			signal,
			logger: this.logger as LoggerService,
			onEvent: (event) => {
				if (event.kind !== 'text') return;
				const payload = event.payload as { text?: unknown } | null;
				const text = typeof payload?.text === 'string' ? payload.text : '';
				if (text.length === 0) return;
				emit({ state: 'running', data: text });
			},
		};

		const agent = this.agents.get<AssistantAgentInput, AssistantAgentOutput>(ASSISTANT_AGENT_TYPE);
		const output = await agent.execute(agentInput, ctx);

		this.logger?.info(LOG_SOURCE, 'Agent task finished', {
			agent: ASSISTANT_AGENT_TYPE,
			chars: output.content.length,
		});

		return output.content;
	}
}
