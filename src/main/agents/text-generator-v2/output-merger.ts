import type {
	TextGeneratorV2Intent,
	TextGeneratorV2ParsedInput,
	TextGeneratorV2Target,
} from './types';

export function mergeOutput(
	original: string,
	selectedText: string | undefined,
	result: string,
	intent: TextGeneratorV2Intent,
	target: TextGeneratorV2Target
): string {
	switch (intent) {
		case 'continue':
			if (!original.trim()) return result;
			return `${original}\n\n${result}`;
		case 'edit':
			if (target === 'selection' && selectedText) {
				return original.replace(selectedText, result);
			}
			return result;
		case 'rewrite':
		case 'summarize':
		case 'analyze':
			return result;
		default:
			return result;
	}
}

export function originalDocument(parsed: TextGeneratorV2ParsedInput): string {
	return parsed.fullText;
}

