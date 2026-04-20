import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { ServiceResolver } from '../../shared/service-resolver';

/**
 * AgentTaskHandler -- bridges the task system to the agent registry.
 *
 * Submit a task with `type: 'agent'` and an input of the shape below.
 * The handler resolves the agent by `agentType`, builds an `AgentContext`
 * (forwarding signal, progress and stream reporters, logger, metadata),
 * and executes the agent's strategy.
 *
 * Renderer payloads never carry API keys. When the agent input contains a
 * `providerId` without an `apiKey`, the handler resolves the key via
 * `ServiceResolver` (which reads from the main-side StoreService).
 */

export interface AgentTaskInput<TAgentInput = unknown> {
	/** Registered agent type (e.g. 'text', 'image', 'rag', 'ocr'). */
	agentType: string;
	/** Input payload forwarded to the agent's `execute`, after apiKey enrichment. */
	input: TAgentInput;
}

export interface AgentTaskOutput<TAgentOutput = unknown> {
	agentType: string;
	output: TAgentOutput;
}

interface ProviderCredentials {
	providerId?: string;
	apiKey?: string;
}

export class AgentTaskHandler
	implements TaskHandler<AgentTaskInput, AgentTaskOutput>
{
	readonly type = 'agent';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver?: ServiceResolver
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
		streamReporter?: StreamReporter,
		metadata?: Record<string, unknown>
	): Promise<AgentTaskOutput> {
		const agent = this.agents.get(input.agentType);
		const enrichedInput = this.enrichWithApiKey(input.input);

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			progress: (percent, message) => reporter.progress(percent, message),
			stream: streamReporter ? (chunk) => streamReporter.stream(chunk) : undefined,
			metadata,
		};

		const output = await agent.execute(enrichedInput, ctx);
		return { agentType: input.agentType, output };
	}

	/**
	 * If the agent input carries a providerId but no apiKey, resolve the
	 * service from the main-side StoreService and splice the key in. Leaves
	 * non-credential payloads untouched.
	 */
	private enrichWithApiKey<T>(raw: T): T {
		if (!this.serviceResolver || !raw || typeof raw !== 'object') return raw;

		const creds = raw as ProviderCredentials;
		if (!creds.providerId || creds.apiKey?.trim()) return raw;

		const resolved = this.serviceResolver.resolve({ providerId: creds.providerId });
		return { ...(raw as object), apiKey: resolved.apiKey } as T;
	}
}
