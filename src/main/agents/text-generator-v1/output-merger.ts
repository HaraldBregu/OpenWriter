import type {
	TextGeneratorV1Intent,
	TextGeneratorV1ParsedInput,
} from './types';

/**
 * Merge the model result back into the document.
 *
 * Rules (per spec):
 *   continue  → original + "\n\n" + result
 *   edit      → replace selectedText in original with result
 *   rewrite   → return result (replaces entire document)
 *
 * Defaults for intents the spec doesn't cover:
 *   summarize → return result (replaces entire document — summary *is* the doc)
 *   analyze   → return result (analysis is the new output, not document body)
 *
 * If callers want the analysis appended, they can handle that externally.
 */
export function mergeOutput(
	parsed: TextGeneratorV1ParsedInput,
	result: string,
	intent: TextGeneratorV1Intent
): string {
	const original = parsed.fullText;
	const clean = result.trim();

	switch (intent) {
		case 'continue':
			return original ? `${original}\n\n${clean}` : clean;

		case 'edit':
			if (parsed.selectedText && original.includes(parsed.selectedText)) {
				return original.replace(parsed.selectedText, clean);
			}
			return clean;

		case 'rewrite':
		case 'summarize':
		case 'analyze':
			return clean;

		default:
			return assertUnreachable(intent);
	}
}

function assertUnreachable(_: TextGeneratorV1Intent): never {
	throw new Error(`mergeOutput: unhandled intent ${_}`);
}
