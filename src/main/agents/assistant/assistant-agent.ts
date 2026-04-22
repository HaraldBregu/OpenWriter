import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { classifyError, toUserMessage } from '../../shared/ai-utils';
import {
	ControllerNode,
	TextNode,
	ImageNode,
	buildSkillRegistry,
	type NodeContext,
} from './nodes';
import { AssistantState, type ControllerDecision, type StateEvent } from './state';
import type { AssistantAgentInput, AssistantAgentOutput } from './types';
import { RunBudget, BudgetExceededError } from './budget';
import { StagnationGuard } from './progress-guard';
import { SkillNotFoundError } from '../skills';

const DEFAULT_MAX_CONTROLLER_STEPS = 12;
const DEFAULT_MAX_TOTAL_TOKENS = 200_000;
const DEFAULT_RUN_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;
const DEFAULT_STAGNATION_WINDOW = 3;

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
		if (input.maxControllerSteps !== undefined && input.maxControllerSteps <= 0) {
			throw new AgentValidationError(this.type, 'maxControllerSteps must be positive');
		}
		if (input.maxTextIterations !== undefined && input.maxTextIterations <= 0) {
			throw new AgentValidationError(this.type, 'maxTextIterations must be positive');
		}
		if (input.maxTotalTokens !== undefined && input.maxTotalTokens <= 0) {
			throw new AgentValidationError(this.type, 'maxTotalTokens must be positive');
		}
		if (input.runTimeoutMs !== undefined && input.runTimeoutMs <= 0) {
			throw new AgentValidationError(this.type, 'runTimeoutMs must be positive');
		}
	}

	protected async run(
		input: AssistantAgentInput,
		ctx: AgentContext
	): Promise<AssistantAgentOutput> {
		const state = new AssistantState();
		const unsubscribe = state.subscribe((event: StateEvent) => {
			ctx.onEvent?.({ kind: event.kind, at: event.at, payload: event.payload });
		});

		state.setStatus('running');

		const maxSteps = input.maxControllerSteps ?? input.maxIterations ?? DEFAULT_MAX_CONTROLLER_STEPS;
		const stagnationWindow = input.stagnationWindow ?? DEFAULT_STAGNATION_WINDOW;
		const perCallTimeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;

		const budget = new RunBudget(
			{
				maxTotalTokens: input.maxTotalTokens ?? DEFAULT_MAX_TOTAL_TOKENS,
				maxWallTimeMs: input.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
			},
			state
		);
		const stagnation = new StagnationGuard({ windowSize: stagnationWindow });
		const skills = buildSkillRegistry(input.skills);

		const nodeCtx: NodeContext = { input, agentCtx: ctx, state };
		const controller = new ControllerNode({ budget, skills, perCallTimeoutMs });
		const textNode = new TextNode({ budget, perCallTimeoutMs });
		const imageNode = new ImageNode();

		let stoppedReason: AssistantAgentOutput['stoppedReason'] = 'max-steps';

		try {
			for (let step = 1; step <= maxSteps; step++) {
				this.ensureNotAborted(ctx.signal);
				budget.checkOrThrow();

				const decision = await controller.decide(nodeCtx);
				if (decision.action === 'done') {
					stoppedReason = 'done';
					break;
				}

				if (stagnation.observe(decision)) {
					stoppedReason = 'stagnation';
					break;
				}

				this.ensureNotAborted(ctx.signal);
				budget.checkOrThrow();
				await dispatch(decision, nodeCtx, textNode, imageNode, skills);
			}

			state.setStatus('done');

			return {
				content: state.finalText,
				toolCalls: [...state.toolCalls],
				iterations: state.iterations,
				usage: state.usage,
				stoppedReason,
			};
		} catch (error) {
			const kind = classifyError(error);
			if (kind === 'abort') {
				state.setStatus('aborted');
				throw error;
			}
			if (error instanceof BudgetExceededError) {
				state.setStatus('error');
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
	imageNode: ImageNode,
	skills: ReturnType<typeof buildSkillRegistry>
): Promise<void> {
	if (decision.action === 'text') {
		const instruction = decision.instruction?.trim() || ctx.input.prompt;
		await textNode.run(ctx, instruction, { toolsAllowlist: decision.toolsAllowlist });
		return;
	}
	if (decision.action === 'skill') {
		const instruction = decision.instruction?.trim() || ctx.input.prompt;
		const skillName = decision.skillName?.trim();
		if (!skillName) {
			throw new Error('controller picked "skill" without skillName');
		}
		let skill;
		try {
			skill = skills.get(skillName);
		} catch (error) {
			if (error instanceof SkillNotFoundError) {
				throw new Error(`controller picked unknown skill: ${skillName}`);
			}
			throw error;
		}
		ctx.state.recordSkillSelection({ skillName, instruction });
		await textNode.run(ctx, instruction, { skill, toolsAllowlist: decision.toolsAllowlist });
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
