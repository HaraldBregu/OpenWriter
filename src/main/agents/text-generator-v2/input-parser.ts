import type { TextGeneratorV2ParsedInput } from './types';

const SELECTED_TEXT_RE = /<selected_text>([\s\S]*?)<\/selected_text>/gi;
const PROMPT_RE = /<prompt>([\s\S]*?)<\/prompt>/gi;

export function parseInput(raw: string): TextGeneratorV2ParsedInput {
	if (typeof raw !== 'string') {
		throw new Error('parseInput: raw must be a string');
	}

	const selectedText = firstTagValue(raw, SELECTED_TEXT_RE);
	const prompt = firstTagValue(raw, PROMPT_RE);

	if (!prompt) {
		throw new Error('parseInput: <prompt>...</prompt> tag is required');
	}

	const fullText = raw
		.replace(SELECTED_TEXT_RE, '')
		.replace(PROMPT_RE, '')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return {
		...(selectedText ? { selectedText } : {}),
		prompt,
		fullText,
	};
}

function firstTagValue(raw: string, pattern: RegExp): string | undefined {
	const match = pattern.exec(raw);
	pattern.lastIndex = 0;
	const value = match?.[1]?.trim();
	return value || undefined;
}

