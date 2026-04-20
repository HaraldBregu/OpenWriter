import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';

/**
 * AgentTaskHandler -- bridges the task system to the agent registry.
 *
 * Submit a task with `type: 'agent'` and an input of the shape below.
 * The handler resolves the agent by `agentType`, builds an `AgentContext`
 * (forwarding signal, progress and stream reporters, logger, metadata),
 * and executes the agent's strategy.
 */

export interface AgentTaskInput<TAgentInput = unknown> {
	/** Registered agent type (e.g. 'text', 'image', 'rag', 'ocr'). */
	agentType: string;
	/** Input payload forwarded verbatim to the agent's `execute`. */
	input: TAgentInput;
}

export interface AgentTaskOutput<TAgentOutput = unknown> {
	agentType: string;
	output: TAgentOutput;
}

export class AgentTaskHandler
	implements TaskHandler<AgentTaskInput, AgentTaskOutput>
{
	readonly type = 'agent';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService
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

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			progress: (percent, message) => reporter.progress(percent, message),
			stream: streamReporter ? (chunk) => streamReporter.stream(chunk) : undefined,
			metadata,
		};

		const output = await agent.execute(input.input, ctx);
		return { agentType: input.agentType, output };
	}
}
