import type OpenAI from 'openai';
import { INTENT_FORMAT, parseIntentClassification } from './schemas';
import type { TextGeneratorV1IntentClassification, TextGeneratorV1ParsedInput } from './types';

const SYSTEM_PROMPT = [
	'You classify an editor user\'s intent for a document transformation system.',
	'Pick exactly ONE intent from:',
	'- continue: extend the existing text with more content in the same voice.',
	'- edit: fix, correct, or refine a specific piece of text (grammar, tone, clarity).',
	'- rewrite: produce a new version of the text (paraphrase, restyle, restructure).',
	'- summarize: condense the text into a shorter form preserving meaning.',
	'- analyze: examine the text and produce analysis/commentary (not a rewrite).',
	'',
	'Target rules:',
	'- If a `selectedText` is provided → target MUST be "selection".',
	'- Otherwise → target MUST be "full".',
	'',
	'Also produce:',
	'- "style": optional short tag (e.g. "academic", "blog", "concise", "formal"). null if not implied.',
	'- "operation": one short imperative sentence describing what to do, derived from the prompt.',
	'',
	'Respond ONLY as strict JSON matching the provided schema.',
].join('\n');

export interface IntentClassifierOptions {
	modelName: string;
	perCallTimeoutMs: number;
}

export async function classifyIntent(
	client: OpenAI,
	parsed: TextGeneratorV1ParsedInput,
	opts: IntentClassifierOptions,
	signal: AbortSignal
): Promise<TextGeneratorV1IntentClassification> {
	const { merged, clear } = attachTimeout(signal, opts.perCallTimeoutMs);
	try {
		const response = await client.responses.create(
			{
				model: opts.modelName,
				input: buildUserMessage(parsed),
				instructions: SYSTEM_PROMPT,
				text: { format: INTENT_FORMAT as never },
			},
			{ signal: merged }
		);

		const text = extractOutputText(response);
		const classification = parseIntentClassification(text);

		// Deterministic override: spec rule is absolute.
		const target = parsed.selectedText ? 'selection' : 'full';
		return { ...classification, target };
	} finally {
		clear();
	}
}

function buildUserMessage(parsed: TextGeneratorV1ParsedInput): string {
	const lines: string[] = [];
	lines.push(`User prompt: ${parsed.prompt}`);
	if (parsed.selectedText) {
		lines.push('');
		lines.push(`Selected text (present → target=selection):`);
		lines.push(parsed.selectedText);
	} else {
		lines.push('');
		lines.push('No selection (target=full).');
	}
	if (parsed.fullText) {
		lines.push('');
		lines.push('Document excerpt (first 800 chars):');
		lines.push(parsed.fullText.slice(0, 800));
	}
	return lines.join('\n');
}

function extractOutputText(response: unknown): string {
	const r = response as { output_text?: string; output?: Array<Record<string, unknown>> };
	if (typeof r.output_text === 'string' && r.output_text.trim()) return r.output_text;

	// Fallback: walk output array for text content.
	if (Array.isArray(r.output)) {
		for (const item of r.output) {
			const content = (item as { content?: Array<Record<string, unknown>> }).content;
			if (!Array.isArray(content)) continue;
			for (const part of content) {
				const text = (part as { text?: string }).text;
				if (typeof text === 'string' && text.trim()) return text;
			}
		}
	}
	throw new Error('classifyIntent: response contained no text output');
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
