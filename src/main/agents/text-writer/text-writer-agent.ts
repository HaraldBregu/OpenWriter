import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { GenerationNode, IntentNode, RouterNode, SkillSelectorNode } from './nodes';
import type {
	TextWriterAgentInput,
	TextWriterAgentOutput,
	TextWriterIntentClassification,
	TextWriterSkill,
	TextWriterSkillSelection,
} from './types';

const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;

export class TextWriterAgent extends BaseAgent<TextWriterAgentInput, TextWriterAgentOutput> {
	readonly type = 'text-writer';

	validate(input: TextWriterAgentInput): void {
		if (!input.prompt?.trim()) throw new AgentValidationError(this.type, 'prompt required');
		if (!input.providerId?.trim())
			throw new AgentValidationError(this.type, 'providerId required');
		if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
		if (!input.modelName?.trim())
			throw new AgentValidationError(this.type, 'modelName required');
	}

	protected async run(
		input: TextWriterAgentInput,
		ctx: AgentContext
	): Promise<TextWriterAgentOutput> {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const perCallTimeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;

		const router = new RouterNode({ perCallTimeoutMs });
		const intentNode = new IntentNode({ perCallTimeoutMs });
		const skillSelector = new SkillSelectorNode({ perCallTimeoutMs });
		const generation = new GenerationNode({ perCallTimeoutMs });

		this.ensureNotAborted(ctx.signal);
		const route = await router.route(client, input, ctx.signal);
		ctx.onEvent?.({ kind: 'route', at: Date.now(), payload: route });

		let intent: TextWriterIntentClassification | null = null;
		let selection: TextWriterSkillSelection | null = null;
		let skill: TextWriterSkill | undefined;
		let instruction = input.prompt;

		if (route.path !== 'direct') {
			this.ensureNotAborted(ctx.signal);
			intent = await intentNode.classify(client, input, ctx.signal);
			ctx.onEvent?.({ kind: 'intent', at: Date.now(), payload: intent });

			if (input.skills?.length) {
				this.ensureNotAborted(ctx.signal);
				selection = await skillSelector.select(client, { input, intent }, ctx.signal);
				skill = resolveSkill(input.skills, selection.skillName);
				if (selection.skillName && !skill) {
					ctx.logger.warn(
						'TextWriterAgent',
						`Skill selector returned skillName="${selection.skillName}" not in catalog; falling back to none`,
						{ available: input.skills.map((s) => s.name) }
					);
				}
				ctx.onEvent?.({
					kind: 'skill:selected',
					at: Date.now(),
					payload: {
						skillName: skill?.name ?? null,
						instruction: selection.instruction,
						reasoning: selection.reasoning,
					},
				});
				if (selection.instruction.trim()) instruction = selection.instruction;
			}
		}

		this.ensureNotAborted(ctx.signal);
		const content = await generation.write(
			client,
			{ input, instruction, path: route.path, skill },
			ctx.signal,
			(delta) => ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } })
		);

		return {
			content,
			path: route.path,
			intent: intent?.intent ?? null,
			skillName: skill?.name ?? null,
			stoppedReason: 'done',
		};
	}
}

function resolveSkill(
	skills: TextWriterSkill[] | undefined,
	name: string | null
): TextWriterSkill | undefined {
	if (!name || !skills) return undefined;
	return skills.find((s) => s.name === name);
}
