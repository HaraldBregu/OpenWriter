import { createOpenAIClient } from '../../../shared/chat-model-factory';
import { isReasoningModel } from '../../../shared/ai-utils';
import type { NodeContext } from './node';
import { extractJsonObject } from './node';
import type { ControllerDecision } from '../state';

const DECIDE_TEMPERATURE = 0;
const SUMMARY_CHAR_LIMIT = 600;
const MAX_HISTORY_STEPS = 20;

const SYSTEM_PROMPT = [
	'You are the reasoning controller for a document assistant that edits a single markdown file (content.md).',
	'You coordinate two worker nodes:',
	'- "text": writes or edits a block of text in content.md. Provide an "instruction" describing the next section to write or the next edit to perform.',
	'- "image": generates an image and automatically appends a markdown reference to content.md. Provide a vivid "imagePrompt".',
	'You may alternate freely between text and image for as many steps as the request demands (e.g., write the opening of a story, generate an illustration, write the next scene, illustrate again, ...).',
	'Stop with action "done" as soon as the full user request has been satisfied.',
	'Respond with strict JSON: {"action":"text"|"image"|"done","instruction":"...","imagePrompt":"...","reason":"..."}.',
	'Only include the fields relevant to the chosen action. Never include prose outside the JSON.',
	'Only request an image if the user request benefits from one. If the image provider is unavailable, do not pick "image".',
].join(' ');

export class ControllerNode {
	readonly name = 'controller' as const;

	async decide(ctx: NodeContext): Promise<ControllerDecision> {
		const { input, agentCtx, state } = ctx;
		const step = state.beginStep(this.name);
		try {
			const client = createOpenAIClient(input.providerId, input.apiKey);
			const temperature = isReasoningModel(input.modelName) ? undefined : DECIDE_TEMPERATURE;

			const response = await client.chat.completions.create(
				{
					model: input.modelName,
					messages: [
						{ role: 'system', content: SYSTEM_PROMPT },
						{ role: 'user', content: buildContext(ctx) },
					],
					...(temperature !== undefined ? { temperature } : {}),
				},
				agentCtx.signal ? { signal: agentCtx.signal } : undefined
			);

			const raw = response.choices[0]?.message?.content ?? '';
			const decision = parseDecision(raw);
			state.recordDecision(decision);
			state.completeStep(step, decision);
			return decision;
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			state.failStep(step, msg);
			throw error;
		}
	}
}

function parseDecision(raw: string): ControllerDecision {
	try {
		const parsed = extractJsonObject(raw);
		const action = parsed.action;
		if (action === 'text' || action === 'image' || action === 'done') {
			return {
				action,
				instruction: typeof parsed.instruction === 'string' ? parsed.instruction : undefined,
				imagePrompt: typeof parsed.imagePrompt === 'string' ? parsed.imagePrompt : undefined,
				reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
			};
		}
	} catch {
		// fall through to default
	}
	return { action: 'done', reason: 'Controller returned invalid decision; stopping.' };
}

function buildContext(ctx: NodeContext): string {
	const { input, state } = ctx;
	const imageAvailable =
		!!input.imageProviderId && !!input.imageApiKey && !!input.imageModelName;
	const snapshot = state.snapshot();
	const recentSteps = snapshot.steps.slice(-MAX_HISTORY_STEPS);

	const lines: string[] = [
		`User request: ${input.prompt}`,
		`Document id: ${input.documentId}`,
		`Image node available: ${imageAvailable ? 'yes' : 'no'}`,
		`Text segments written: ${snapshot.textSegments.length}`,
		`Images generated: ${snapshot.images.length}`,
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
