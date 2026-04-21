import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { classifyError, toUserMessage } from '../../shared/ai-utils';
import {
	IntentNode,
	PlannerNode,
	ImageNode,
	TextNode,
	type AssistantNode,
	type NodeContext,
	type NodeEvent,
	type NodeState,
} from './nodes';
import type { AssistantAgentInput, AssistantAgentOutput } from './types';

const PROGRESS_PER_NODE = 25;

export class AssistantAgent extends BaseAgent<AssistantAgentInput, AssistantAgentOutput> {
	readonly type = 'assistant';

	validate(input: AssistantAgentInput): void {
		if (!input.prompt?.trim()) {
			throw new AgentValidationError(this.type, 'prompt required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
		if (!input.providerId?.trim()) {
			throw new AgentValidationError(this.type, 'providerId required');
		}
		if (!input.documentPath?.trim()) {
			throw new AgentValidationError(this.type, 'documentPath required');
		}
		if (input.maxIterations !== undefined && input.maxIterations <= 0) {
			throw new AgentValidationError(this.type, 'maxIterations must be positive');
		}
	}

	protected async run(
		input: AssistantAgentInput,
		ctx: AgentContext
	): Promise<AssistantAgentOutput> {
		const state: NodeState = { toolCalls: [], iterations: 0 };
		const emit = (event: NodeEvent): void => {
			ctx.stream?.(JSON.stringify(event) + '\n');
		};
		const nodeCtx: NodeContext = { input, agentCtx: ctx, emit, state };

		try {
			const planning: AssistantNode[] = [new IntentNode(), new PlannerNode()];
			let step = 0;
			for (const node of planning) {
				this.ensureNotAborted(ctx.signal);
				step++;
				ctx.progress?.(step * PROGRESS_PER_NODE, node.name);
				await this.runNode(node, nodeCtx);
			}

			const execution = planExecution(state);
			for (const node of execution) {
				this.ensureNotAborted(ctx.signal);
				step++;
				ctx.progress?.(Math.min(90, step * PROGRESS_PER_NODE), node.name);
				await this.runNode(node, nodeCtx);
			}

			ctx.progress?.(100, 'done');

			return {
				content: state.textResult ?? '',
				toolCalls: state.toolCalls,
				iterations: state.iterations,
			};
		} catch (error) {
			const kind = classifyError(error);
			if (kind === 'abort') throw error;
			const raw = error instanceof Error ? error.message : String(error);
			throw new Error(toUserMessage(kind, raw));
		}
	}

	private async runNode(node: AssistantNode, ctx: NodeContext): Promise<void> {
		try {
			await node.run(ctx);
		} catch (error) {
			const raw = error instanceof Error ? error.message : String(error);
			ctx.emit({ node: node.name, status: 'error', error: raw });
			throw error;
		}
	}
}

function planExecution(state: NodeState): AssistantNode[] {
	const { intent, order } = state;
	if (intent === 'none') return [];
	if (intent === 'image') return [new ImageNode()];
	if (intent === 'text') return [new TextNode()];
	return order === 'text_first'
		? [new TextNode(), new ImageNode()]
		: [new ImageNode(), new TextNode()];
}
