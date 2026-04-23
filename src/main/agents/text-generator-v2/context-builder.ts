import type {
	TextGeneratorV2Context,
	TextGeneratorV2IntentClassification,
	TextGeneratorV2ParsedInput,
} from './types';

export function buildContext(
	parsed: TextGeneratorV2ParsedInput,
	classification: TextGeneratorV2IntentClassification
): TextGeneratorV2Context {
	const operateOn =
		classification.target === 'selection' && parsed.selectedText ? parsed.selectedText : parsed.fullText;

	return {
		parsed,
		classification,
		operateOn,
	};
}

