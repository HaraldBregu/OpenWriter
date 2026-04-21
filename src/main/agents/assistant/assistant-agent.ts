import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { classifyError, toUserMessage } from '../../shared/ai-utils';
import {
	ControllerNode,
	TextNode,
	ImageNode,
	type NodeContext,
} from './nodes';
import { AssistantState, type ControllerDecision, type StateEvent } from './state';
import type { AssistantAgentInput, AssistantAgentOutput } from './types';

const DEFAULT_MAX_CONTROLLER_STEPS = 12;
const PROGRESS_PER_STEP_PERCENT = 90;

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
		const state = new AssistantState();
		const unsubscribe = state.subscribe((event: StateEvent) => {
			ctx.stream?.(JSON.stringify(event) + '\n');
		});

		state.setStatus('running');

		const nodeCtx: NodeContext = { input, agentCtx: ctx, state };
		const controller = new ControllerNode();
		const textNode = new TextNode();
		const imageNode = new ImageNode();

		const maxSteps = input.maxIterations ?? DEFAULT_MAX_CONTROLLER_STEPS;

		try {
			for (let step = 1; step <= maxSteps; step++) {
				this.ensureNotAborted(ctx.signal);
				ctx.progress?.(progressFor(step, maxSteps), `step ${step}`);

				const decision = await controller.decide(nodeCtx);
				if (decision.action === 'done') break;

				this.ensureNotAborted(ctx.signal);
				await dispatch(decision, nodeCtx, textNode, imageNode);
			}

			state.setStatus('done');
			ctx.progress?.(100, 'done');

			return {
				content: state.finalText,
				toolCalls: [...state.toolCalls],
				iterations: state.iterations,
			};
		} catch (error) {
			const kind = classifyError(error);
			if (kind === 'abort') {
				state.setStatus('aborted');
				throw error;
			}
			state.setStatus('error');
			const raw = error instanceof Error ? error.message : String(error);
			throw new Error(toUserMessage(kind, raw));
		} finally {
			unsubscribe();
		}
	}
}

async function dispatch(
	decision: ControllerDecision,
	ctx: NodeContext,
	textNode: TextNode,
	imageNode: ImageNode
): Promise<void> {
	if (decision.action === 'text') {
		const instruction = decision.instruction?.trim() || ctx.input.prompt;
		await textNode.run(ctx, instruction);
		return;
	}
	if (decision.action === 'image') {
		const imagePrompt = decision.imagePrompt?.trim() || ctx.input.prompt;
		await imageNode.run(ctx, imagePrompt);
	}
}

function progressFor(step: number, maxSteps: number): number {
	return Math.min(PROGRESS_PER_STEP_PERCENT, Math.round((step / maxSteps) * PROGRESS_PER_STEP_PERCENT));
}
