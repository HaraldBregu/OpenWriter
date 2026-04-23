import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { callChat } from '../llm-call';
import { DECISION_SCHEMA, parseDecision } from '../schemas';
import type {
	WriterAgentInput,
	WriterDecision,
	WriterIntentClassification,
	WriterSkill,
} from '../types';

const SYSTEM_PROMPT = [
	'You are the controller for a writing agent. Pick the next action.',
	'Actions:',
	'- "text": call the text worker to write; provide a concise "instruction".',
	'- "skill": delegate to a named skill from the catalog; provide "skillName" (exact match from catalog) and "instruction".',
	'- "done": the user request is satisfied; no further writing needed.',
	'Pick "skill" ONLY when a listed skill\'s description clearly matches the user\'s intent and request.',
	'If no skill clearly applies, pick "text". Picking a skill that does not match the intent is WORSE than picking "text".',
	'Never invent a skillName that is not in the catalog. If the catalog is empty, you cannot pick "skill".',
	'Respond as strict JSON matching the provided schema. Use null for fields not relevant to the chosen action.',
].join(' ');

export interface ControllerNodeOptions {
	perCallTimeoutMs: number;
}

export interface ControllerContext {
	input: WriterAgentInput;
	intent: WriterIntentClassification;
	history: string[];
}

export class ControllerNode {
	readonly name = 'controller' as const;

	constructor(private readonly opts: ControllerNodeOptions) {}

	async decide(
		client: OpenAI,
		ctx: ControllerContext,
		signal: AbortSignal
	): Promise<WriterDecision> {
		const temperature = isReasoningModel(ctx.input.modelName) ? undefined : 0;
		const raw = await callChat({
			client,
			params: {
				model: ctx.input.modelName,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: buildContext(ctx) },
				],
				response_format: DECISION_SCHEMA,
				...(temperature !== undefined ? { temperature } : {}),
			},
			signal,
			timeoutMs: this.opts.perCallTimeoutMs,
		});
		return parseDecision(raw);
	}
}

function buildContext(ctx: ControllerContext): string {
	const lines = [
		`User request: ${ctx.input.prompt}`,
		`Classified intent: ${ctx.intent.intent} (${ctx.intent.summary})`,
		'',
		'Skill catalog (cross-reference each skill\'s description against the classified intent and user request):',
		...renderSkillCatalog(ctx.input.skills),
		'',
		'History so far:',
	];
	if (ctx.history.length === 0) {
		lines.push('  (none)');
	} else {
		ctx.history.forEach((h, i) => lines.push(`  #${i + 1} ${h}`));
	}
	lines.push('', 'Decide the next action.');
	return lines.join('\n');
}

function renderSkillCatalog(skills?: WriterSkill[]): string[] {
	if (!skills || skills.length === 0) return ['  (no skills available — do not pick action "skill")'];
	return skills.map((s, i) => `  ${i + 1}. ${s.name} — ${s.description}`);
}
