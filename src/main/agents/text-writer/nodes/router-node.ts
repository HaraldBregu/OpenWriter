import type OpenAI from 'openai';
import { isReasoningModel } from '../../../shared/ai-utils';
import { callChat } from '../llm-call';
import { ROUTE_SCHEMA, parseRoute } from '../schemas';
import type { TextWriterAgentInput, TextWriterRoute, TextWriterSkill } from '../types';

const SYSTEM_PROMPT = [
	'You route a text-writer request to the simplest path that can answer it well.',
	'Paths:',
	'- "direct": simple question or short request. Skip intent classification and skill selection. Produce a concise response directly.',
	'- "skilled": the request likely benefits from classifying intent and consulting a skill from the catalog. Use this when a skill clearly applies or when intent disambiguates the work.',
	'- "exhaustive": the request is complex, open-ended, or multi-faceted and warrants a thorough, structured response. Intent and skill selection run, then an in-depth generation.',
	'Prefer the simplest path that fits. Picking "exhaustive" for a simple question is worse than "direct".',
	'If the skill catalog is empty, do not pick "skilled" solely because of skills — pick "direct" or "exhaustive" based on complexity.',
	'Respond as strict JSON matching the provided schema.',
].join(' ');

export interface RouterNodeOptions {
	perCallTimeoutMs: number;
}

export class RouterNode {
	readonly name = 'router' as const;

	constructor(private readonly opts: RouterNodeOptions) {}

	async route(
		client: OpenAI,
		input: TextWriterAgentInput,
		signal: AbortSignal
	): Promise<TextWriterRoute> {
		const temperature = isReasoningModel(input.modelName) ? undefined : 0;
		const raw = await callChat({
			client,
			params: {
				model: input.modelName,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: buildContext(input) },
				],
				response_format: ROUTE_SCHEMA,
				...(temperature !== undefined ? { temperature } : {}),
			},
			signal,
			timeoutMs: this.opts.perCallTimeoutMs,
		});
		return parseRoute(raw);
	}
}

function buildContext(input: TextWriterAgentInput): string {
	const lines = [
		`User request: ${input.prompt}`,
		'',
		'Skill catalog:',
		...renderSkillCatalog(input.skills),
		'',
		'Choose the path.',
	];
	return lines.join('\n');
}

function renderSkillCatalog(skills?: TextWriterSkill[]): string[] {
	if (!skills || skills.length === 0) return ['  (empty)'];
	return skills.map((s, i) => `  ${i + 1}. ${s.name} — ${s.description}`);
}
