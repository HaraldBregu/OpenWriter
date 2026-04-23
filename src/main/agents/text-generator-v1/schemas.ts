import type {
	TextGeneratorV1Intent,
	TextGeneratorV1IntentClassification,
	TextGeneratorV1Target,
} from './types';

export const INTENT_VALUES: readonly TextGeneratorV1Intent[] = [
	'continue',
	'edit',
	'rewrite',
	'summarize',
	'analyze',
];

export const TARGET_VALUES: readonly TextGeneratorV1Target[] = ['selection', 'full'];

export const INTENT_FORMAT = {
	type: 'json_schema',
	name: 'text_generator_v1_intent',
	strict: true,
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['intent', 'target', 'style', 'operation'],
		properties: {
			intent: { type: 'string', enum: INTENT_VALUES },
			target: { type: 'string', enum: TARGET_VALUES },
			style: { type: ['string', 'null'] },
			operation: { type: 'string' },
		},
	},
} as const;

export function parseIntentClassification(raw: string): TextGeneratorV1IntentClassification {
	const parsed = parseJson(raw);

	const intent = parsed.intent;
	if (typeof intent !== 'string' || !INTENT_VALUES.includes(intent as TextGeneratorV1Intent)) {
		throw new Error(`parseIntentClassification: invalid intent ${JSON.stringify(intent)}`);
	}

	const target = parsed.target;
	if (typeof target !== 'string' || !TARGET_VALUES.includes(target as TextGeneratorV1Target)) {
		throw new Error(`parseIntentClassification: invalid target ${JSON.stringify(target)}`);
	}

	const operation = typeof parsed.operation === 'string' ? parsed.operation : '';
	const style =
		typeof parsed.style === 'string' && parsed.style.trim().length > 0
			? parsed.style
			: undefined;

	return {
		intent: intent as TextGeneratorV1Intent,
		target: target as TextGeneratorV1Target,
		operation,
		...(style ? { style } : {}),
	};
}

function parseJson(raw: string): Record<string, unknown> {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Empty JSON response');
	try {
		return JSON.parse(trimmed) as Record<string, unknown>;
	} catch {
		const match = /\{[\s\S]*\}/.exec(trimmed);
		if (!match) throw new Error('No JSON object found in response');
		return JSON.parse(match[0]) as Record<string, unknown>;
	}
}
