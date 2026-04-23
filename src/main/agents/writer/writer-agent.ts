import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { ControllerNode, IntentNode, TextNode } from './nodes';
import type {
	WriterAgentInput,
	WriterAgentOutput,
	WriterDecision,
	WriterSkill,
} from './types';

const DEFAULT_MAX_STEPS = 3;
const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;

export class WriterAgent extends BaseAgent<WriterAgentInput, WriterAgentOutput> {
	readonly type = 'writer';

	validate(input: WriterAgentInput): void {
		if (!input.prompt?.trim()) throw new AgentValidationError(this.type, 'prompt required');
		if (!input.providerId?.trim())
			throw new AgentValidationError(this.type, 'providerId required');
		if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
		if (!input.modelName?.trim())
			throw new AgentValidationError(this.type, 'modelName required');
		if (input.maxSteps !== undefined && input.maxSteps <= 0)
			throw new AgentValidationError(this.type, 'maxSteps must be positive');
	}

	protected async run(
		input: WriterAgentInput,
		ctx: AgentContext
	): Promise<WriterAgentOutput> {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
		const perCallTimeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;

		const intentNode = new IntentNode({ perCallTimeoutMs });
		const controller = new ControllerNode({ perCallTimeoutMs });
		const textNode = new TextNode({ perCallTimeoutMs });

		this.ensureNotAborted(ctx.signal);
		const intent = await intentNode.classify(client, input, ctx.signal);
		ctx.onEvent?.({ kind: 'intent', at: Date.now(), payload: intent });

		const history: string[] = [];
		let content = '';
		let stoppedReason: WriterAgentOutput['stoppedReason'] = 'max-steps';
		let steps = 0;

		for (let step = 1; step <= maxSteps; step++) {
			this.ensureNotAborted(ctx.signal);
			steps = step;
			const decision = await controller.decide(
				client,
				{ input, intent, history },
				ctx.signal
			);
			ctx.onEvent?.({ kind: 'decision', at: Date.now(), payload: decision });

			if (decision.action === 'done') {
				stoppedReason = 'done';
				break;
			}

			const instruction = decision.instruction?.trim() || input.prompt;
			let skill: WriterSkill | undefined;
			if (decision.action === 'skill') {
				skill = resolveSkill(input.skills, decision.skillName);
				if (!skill) {
					ctx.logger.warn(
						'WriterAgent',
						`Controller picked action:"skill" but skillName="${decision.skillName}" is not in catalog; falling back to action:"text"`,
						{ available: (input.skills ?? []).map((s) => s.name) }
					);
				} else {
					ctx.onEvent?.({
						kind: 'skill:selected',
						at: Date.now(),
						payload: { skillName: skill.name, instruction },
					});
				}
			}

			this.ensureNotAborted(ctx.signal);
			const segment = await textNode.write(
				client,
				{ input, instruction, skill },
				ctx.signal,
				(delta) => ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } })
			);
			content += segment;
			history.push(summarizeStep(decision, segment));

			if (decision.action === 'text' || decision.action === 'skill') {
				stoppedReason = 'done';
				break;
			}
		}

		return { content, intent: intent.intent, steps, stoppedReason };
	}
}

function resolveSkill(
	skills: WriterSkill[] | undefined,
	name: string | null
): WriterSkill | undefined {
	if (!name || !skills) return undefined;
	return skills.find((s) => s.name === name);
}

function summarizeStep(decision: WriterDecision, segment: string): string {
	const preview = segment.slice(0, 120).replace(/\s+/g, ' ');
	const tag =
		decision.action === 'skill' && decision.skillName
			? `skill:${decision.skillName}`
			: decision.action;
	return `${tag} → "${preview}${segment.length > 120 ? '...' : ''}"`;
}
