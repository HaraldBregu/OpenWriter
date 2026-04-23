import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { callChat } from '../llm-call';
import { SKILL_SELECTION_SCHEMA, parseSkillSelection } from '../schemas';
import type {
	TextWriterAgentInput,
	TextWriterIntentClassification,
	TextWriterSkill,
	TextWriterSkillSelection,
} from '../types';

const SYSTEM_PROMPT = [
	'You select at most one skill from a catalog to apply to a text-writer request.',
	'Pick a skillName ONLY when a listed skill\'s description clearly matches the request and intent.',
	'If no skill clearly applies, return skillName: null — that is the correct answer when the catalog does not fit.',
	'Never invent a skillName that is not in the catalog.',
	'Always return a concise "instruction" to pass to the generation step, rephrased from the user request and incorporating the chosen skill if any.',
	'Respond as strict JSON matching the provided schema.',
].join(' ');

export interface SkillSelectorNodeOptions {
	perCallTimeoutMs: number;
}

export interface SkillSelectorContext {
	input: TextWriterAgentInput;
	intent: TextWriterIntentClassification;
}

export class SkillSelectorNode {
	readonly name = 'skill-selector' as const;

	constructor(private readonly opts: SkillSelectorNodeOptions) {}

	async select(
		client: OpenAI,
		ctx: SkillSelectorContext,
		signal: AbortSignal
	): Promise<TextWriterSkillSelection> {
		const temperature = isReasoningModel(ctx.input.modelName) ? undefined : 0;
		const raw = await callChat({
			client,
			params: {
				model: ctx.input.modelName,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: buildContext(ctx) },
				],
				response_format: SKILL_SELECTION_SCHEMA,
				...(temperature !== undefined ? { temperature } : {}),
			},
			signal,
			timeoutMs: this.opts.perCallTimeoutMs,
		});
		return parseSkillSelection(raw);
	}
}

function buildContext(ctx: SkillSelectorContext): string {
	const lines = [
		`User request: ${ctx.input.prompt}`,
		`Classified intent: ${ctx.intent.intent} (${ctx.intent.summary})`,
		'',
		'Skill catalog (cross-reference each skill against the request and intent):',
		...renderSkillCatalog(ctx.input.skills),
		'',
		'Select one skill or none.',
	];
	return lines.join('\n');
}

function renderSkillCatalog(skills?: TextWriterSkill[]): string[] {
	if (!skills || skills.length === 0) return ['  (empty — return skillName: null)'];
	return skills.map((s, i) => `  ${i + 1}. ${s.name} — ${s.description}`);
}
