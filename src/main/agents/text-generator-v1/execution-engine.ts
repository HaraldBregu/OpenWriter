import type OpenAI from 'openai';
import type {
	TextGeneratorV1Context,
	TextGeneratorV1ExecutionOutput,
	TextGeneratorV1Intent,
} from './types';

const INTENT_DIRECTIVES: Record<TextGeneratorV1Intent, string> = {
	continue: 'Extend the provided text with new content in the same voice and style. Output ONLY the continuation, no preamble.',
	edit: 'Revise the provided selection to fix issues described in the prompt. Output ONLY the revised selection, nothing else.',
	rewrite: 'Rewrite the provided text per the prompt. Output ONLY the rewritten text.',
	summarize: 'Summarize the provided text per the prompt. Output ONLY the summary.',
	analyze: 'Analyze the provided text per the prompt. Output the analysis only.',
};

const SYSTEM_INSTRUCTIONS = [
	'You are a writing engine embedded in a document editor.',
	'You have access to a shell environment and, when provided, reference skills.',
	'Use skills only when they are relevant — a skill is a set of instructions on HOW to perform the task.',
	'Never explain yourself. Never output commentary or labels. Output only the text that belongs in the document.',
].join(' ');

export interface ExecutionEngineOptions {
	modelName: string;
	perCallTimeoutMs: number;
	stream?: boolean;
	onDelta?: (delta: string) => void;
}

/**
 * Execute the editing task via OpenAI Responses API with shell + skills.
 *
 * Per spec: we only hand the model the skills; the model decides when/how to use them.
 */
export async function executeWithSkills(
	client: OpenAI,
	ctx: TextGeneratorV1Context,
	skillIds: string[],
	opts: ExecutionEngineOptions,
	signal: AbortSignal
): Promise<TextGeneratorV1ExecutionOutput> {
	const input = buildModelInput(ctx);
	const tools = buildShellToolWithSkills(skillIds);

	const { merged, clear } = attachTimeout(signal, opts.perCallTimeoutMs);
	try {
		if (opts.stream) {
			return await runStreaming(client, {
				model: opts.modelName,
				input,
				tools,
				instructions: SYSTEM_INSTRUCTIONS,
				signal: merged,
				onDelta: opts.onDelta,
				skillIds,
			});
		}
		return await runNonStreaming(client, {
			model: opts.modelName,
			input,
			tools,
			instructions: SYSTEM_INSTRUCTIONS,
			signal: merged,
			skillIds,
		});
	} finally {
		clear();
	}
}

function buildModelInput(ctx: TextGeneratorV1Context): string {
	const { parsed, classification, operateOn } = ctx;
	const lines: string[] = [];
	lines.push(`Intent: ${classification.intent}`);
	lines.push(`Target: ${classification.target}`);
	if (classification.style) lines.push(`Style hint: ${classification.style}`);
	lines.push(`Operation: ${classification.operation || parsed.prompt}`);
	lines.push('');
	lines.push(`Directive: ${INTENT_DIRECTIVES[classification.intent]}`);
	lines.push('');
	lines.push(`User prompt: ${parsed.prompt}`);
	lines.push('');
	if (classification.target === 'selection' && parsed.selectedText) {
		lines.push('--- SELECTION TO OPERATE ON ---');
		lines.push(parsed.selectedText);
		lines.push('--- END SELECTION ---');
		if (parsed.fullText && parsed.fullText !== parsed.selectedText) {
			lines.push('');
			lines.push('--- SURROUNDING DOCUMENT (context only, do not rewrite) ---');
			lines.push(parsed.fullText);
			lines.push('--- END DOCUMENT ---');
		}
	} else {
		lines.push('--- FULL DOCUMENT TO OPERATE ON ---');
		lines.push(operateOn);
		lines.push('--- END DOCUMENT ---');
	}
	return lines.join('\n');
}

function buildShellToolWithSkills(skillIds: string[]): unknown[] {
	return [
		{
			type: 'shell',
			environment: {
				type: 'container_auto',
				skills: skillIds.map((skill_id) => ({
					type: 'skill_reference',
					skill_id,
				})),
			},
		},
	];
}

interface RunArgs {
	model: string;
	input: string;
	tools: unknown[];
	instructions: string;
	signal: AbortSignal;
	skillIds: string[];
	onDelta?: (delta: string) => void;
}

async function runNonStreaming(
	client: OpenAI,
	args: RunArgs
): Promise<TextGeneratorV1ExecutionOutput> {
	const response = await client.responses.create(
		{
			model: args.model,
			instructions: args.instructions,
			input: args.input,
			tools: args.tools as never,
		},
		{ signal: args.signal }
	);
	const r = response as { id: string; output_text?: string; output?: unknown };
	const text = typeof r.output_text === 'string' ? r.output_text : extractText(r.output);
	if (!text) throw new Error('executeWithSkills: response produced no text');
	return { result: text.trim(), responseId: r.id, usedSkillIds: args.skillIds };
}

async function runStreaming(
	client: OpenAI,
	args: RunArgs
): Promise<TextGeneratorV1ExecutionOutput> {
	const stream = await client.responses.create(
		{
			model: args.model,
			instructions: args.instructions,
			input: args.input,
			tools: args.tools as never,
			stream: true,
		},
		{ signal: args.signal }
	);

	let accumulated = '';
	let responseId = '';

	for await (const event of stream as AsyncIterable<Record<string, unknown>>) {
		if (args.signal.aborted) throw new DOMException('Aborted', 'AbortError');
		const type = event.type as string | undefined;
		if (type === 'response.created' || type === 'response.in_progress') {
			const res = event.response as { id?: string } | undefined;
			if (res?.id) responseId = res.id;
		} else if (type === 'response.output_text.delta') {
			const delta = typeof event.delta === 'string' ? event.delta : '';
			if (delta) {
				accumulated += delta;
				args.onDelta?.(delta);
			}
		} else if (type === 'response.completed') {
			const res = event.response as { id?: string; output_text?: string } | undefined;
			if (res?.id) responseId = res.id;
			if (res?.output_text && !accumulated) accumulated = res.output_text;
		}
	}

	if (!accumulated) throw new Error('executeWithSkills: stream produced no text');
	if (!responseId) responseId = 'unknown';
	return { result: accumulated.trim(), responseId, usedSkillIds: args.skillIds };
}

function extractText(output: unknown): string {
	if (!Array.isArray(output)) return '';
	const parts: string[] = [];
	for (const item of output) {
		const content = (item as { content?: Array<Record<string, unknown>> }).content;
		if (!Array.isArray(content)) continue;
		for (const part of content) {
			const text = (part as { text?: string }).text;
			if (typeof text === 'string') parts.push(text);
		}
	}
	return parts.join('');
}

function attachTimeout(
	signal: AbortSignal,
	timeoutMs: number
): { merged: AbortSignal; clear: () => void } {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
	const onAbort = (): void => controller.abort(signal.reason);
	if (signal.aborted) controller.abort(signal.reason);
	else signal.addEventListener('abort', onAbort, { once: true });
	return {
		merged: controller.signal,
		clear: () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', onAbort);
		},
	};
}
