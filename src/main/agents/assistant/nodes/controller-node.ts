import type OpenAI from 'openai';
import { createOpenAIClient } from '../../../shared/chat-model-factory';
import { isReasoningModel } from '../../../shared/ai-utils';
import type { SkillRegistry } from '../../skills';
import { CONTROLLER_JSON_SCHEMA, validateDecision } from '../decision-schema';
import { callChat } from '../llm-call';
import type { RunBudget } from '../budget';
import { renderSkillsCatalogSection } from './skill-context';
import type { NodeContext } from './node';
import { extractJsonObject } from './node';
import type { ControllerDecision } from '../state';

const DECIDE_TEMPERATURE = 0;
const SUMMARY_CHAR_LIMIT = 600;
const MAX_HISTORY_STEPS = 20;
const PARSE_RETRY_BUDGET = 1;

const SYSTEM_PROMPT = [
	'You are the reasoning controller for a document assistant that edits a single markdown file (content.md).',
	'You coordinate worker nodes:',
	'- "text": writes or edits a block of text in content.md. Provide an "instruction" describing the next section to write or the next edit to perform.',
	'- "image": generates an image and automatically appends a markdown reference to content.md. Provide a vivid "imagePrompt".',
	'- "skill": delegates the next step to a skill from the available_skills catalog. Provide "skillName" and an "instruction" scoped to that skill.',
	'You may alternate between actions for as many steps as the request demands.',
	'Stop with action "done" as soon as the full user request has been satisfied.',
	'Respond with strict JSON matching the provided schema. Always include every property; use null for fields not relevant to the chosen action.',
	'Never include prose outside the JSON.',
	'Only request an image if the user request benefits from one. If the image provider is unavailable, do not pick "image".',
	'Only pick "skill" when a listed skill clearly matches the next step; otherwise pick "text".',
].join(' ');

export interface ControllerNodeOptions {
	budget: RunBudget;
	skills: SkillRegistry;
	perCallTimeoutMs: number;
}

export class ControllerNode {
	readonly name = 'controller' as const;

	constructor(private readonly opts: ControllerNodeOptions) {}

	async decide(ctx: NodeContext): Promise<ControllerDecision> {
		const { input, agentCtx, state } = ctx;
		const step = state.beginStep(this.name);
		try {
			const client = createOpenAIClient(input.providerId, input.apiKey);
			const temperature = isReasoningModel(input.modelName) ? undefined : DECIDE_TEMPERATURE;
			const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
				{ role: 'system', content: SYSTEM_PROMPT + '\n\n' + renderSkillsCatalogSection(this.opts.skills) },
				{ role: 'user', content: buildContext(ctx) },
			];

			let decision: ControllerDecision | undefined;
			let attempts = 0;

			while (attempts <= PARSE_RETRY_BUDGET && !decision) {
				const raw = await this.callController(client, messages, temperature, input.modelName, ctx);
				const { decision: parsed, error } = tryParse(raw);
				if (parsed) {
					decision = parsed;
					break;
				}
				state.recordInvalidDecision(raw, error ?? 'unknown parse error');
				if (attempts === PARSE_RETRY_BUDGET) {
					throw new Error(`Controller returned invalid decision: ${error}`);
				}
				messages.push({ role: 'assistant', content: raw });
				messages.push({
					role: 'user',
					content: `The previous response was not valid JSON for the controller schema (${error}). Respond again with strict JSON only.`,
				});
				attempts += 1;
			}

			const finalDecision = decision!;
			state.recordDecision(finalDecision);
			state.completeStep(step, finalDecision);
			return finalDecision;
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			state.failStep(step, msg);
			throw error;
		}
	}

	private async callController(
		client: OpenAI,
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
		temperature: number | undefined,
		modelName: string,
		ctx: NodeContext
	): Promise<string> {
		const params = {
			model: modelName,
			messages,
			...(temperature !== undefined ? { temperature } : {}),
			response_format: {
				type: 'json_schema' as const,
				json_schema: CONTROLLER_JSON_SCHEMA,
			},
		} satisfies OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

		try {
			const response = await callChat({
				client,
				params,
				signal: ctx.agentCtx.signal,
				budget: this.opts.budget,
				label: 'controller',
				timeoutMs: this.opts.perCallTimeoutMs,
			});
			return response.choices[0]?.message?.content ?? '';
		} catch (error) {
			if (isSchemaUnsupportedError(error)) {
				const { response_format: _rf, ...fallbackParams } = params;
				const fallback = await callChat({
					client,
					params: {
						...fallbackParams,
						response_format: { type: 'json_object' as const },
					},
					signal: ctx.agentCtx.signal,
					budget: this.opts.budget,
					label: 'controller:json_object',
					timeoutMs: this.opts.perCallTimeoutMs,
				});
				return fallback.choices[0]?.message?.content ?? '';
			}
			throw error;
		}
	}
}

function tryParse(raw: string): { decision?: ControllerDecision; error?: string } {
	if (!raw.trim()) return { error: 'empty response' };
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		try {
			parsed = extractJsonObject(raw);
		} catch (err) {
			return { error: (err as Error).message };
		}
	}
	return validateDecision(parsed);
}

function isSchemaUnsupportedError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message.toLowerCase();
	return (
		msg.includes('response_format') ||
		msg.includes('json_schema') ||
		msg.includes('not supported')
	);
}

function buildContext(ctx: NodeContext): string {
	const { input, state } = ctx;
	const imageAvailable =
		!!input.imageProviderId && !!input.imageApiKey && !!input.imageModelName;
	const skillsAvailable = (input.skills?.length ?? 0) > 0;
	const snapshot = state.snapshot();
	const recentSteps = snapshot.steps.slice(-MAX_HISTORY_STEPS);

	const lines: string[] = [
		`User request: ${input.prompt}`,
		`Document id: ${input.documentId}`,
		`Image node available: ${imageAvailable ? 'yes' : 'no'}`,
		`Skills available: ${skillsAvailable ? 'yes' : 'no'}`,
		`Text segments written: ${snapshot.textSegments.length}`,
		`Images generated: ${snapshot.images.length}`,
		`Tokens used so far: ${snapshot.usage.totalTokens}`,
		'',
		'Recent step history:',
	];

	if (recentSteps.length === 0) {
		lines.push('  (none yet — this is the first decision)');
	} else {
		for (const step of recentSteps) {
			const detail = step.error
				? ` error="${truncate(step.error, SUMMARY_CHAR_LIMIT)}"`
				: step.action
					? ` action="${truncate(step.action, SUMMARY_CHAR_LIMIT)}"`
					: '';
			lines.push(`  #${step.index} ${step.node} ${step.status}${detail}`);
		}
	}

	if (snapshot.images.length > 0) {
		lines.push('', 'Images generated so far:');
		for (const img of snapshot.images) {
			lines.push(`  - ${img.relativePath} (prompt: ${truncate(img.prompt, SUMMARY_CHAR_LIMIT)})`);
		}
	}

	if (snapshot.skillsSelected.length > 0) {
		lines.push('', 'Skills previously selected:');
		for (const s of snapshot.skillsSelected) {
			lines.push(`  - ${s.skillName}${s.instruction ? ` :: ${truncate(s.instruction, SUMMARY_CHAR_LIMIT)}` : ''}`);
		}
	}

	const lastText = snapshot.textSegments[snapshot.textSegments.length - 1];
	if (lastText) {
		lines.push('', 'Last text segment written:');
		lines.push(truncate(lastText, SUMMARY_CHAR_LIMIT));
	}

	lines.push('', 'Decide the next action.');
	return lines.join('\n');
}

function truncate(value: string, limit: number): string {
	if (value.length <= limit) return value;
	return value.slice(0, limit - 3) + '...';
}
