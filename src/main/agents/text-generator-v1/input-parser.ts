import type { TextGeneratorV1ParsedInput } from './types';

const SELECTED_TEXT_RE = /<selected_text>([\s\S]*?)<\/selected_text>/gi;
const PROMPT_RE = /<prompt>([\s\S]*?)<\/prompt>/gi;

/**
 * Extract `<selected_text>` and `<prompt>` tags from raw input.
 *
 * Supports multiple `<selected_text>` occurrences (joined with newlines).
 * `prompt` is required; first occurrence wins if multiple.
 * `fullText` is the raw with all tags stripped and whitespace tidied.
 */
export function parseInput(raw: string): TextGeneratorV1ParsedInput {
	if (typeof raw !== 'string') {
		throw new Error('parseInput: raw must be a string');
	}

	const selections: string[] = [];
	for (const match of raw.matchAll(SELECTED_TEXT_RE)) {
		const value = match[1]?.trim();
		if (value) selections.push(value);
	}

	const prompts: string[] = [];
	for (const match of raw.matchAll(PROMPT_RE)) {
		const value = match[1]?.trim();
		if (value) prompts.push(value);
	}

	if (prompts.length === 0) {
		throw new Error('parseInput: <prompt>...</prompt> tag is required');
	}

	const fullText = raw
		.replace(SELECTED_TEXT_RE, '')
		.replace(PROMPT_RE, '')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return {
		selectedText: selections.length > 0 ? selections.join('\n') : undefined,
		prompt: prompts[0]!,
		fullText,
	};
}
