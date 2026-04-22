import type OpenAI from 'openai';
import type { WriterDecision, WriterIntent, WriterIntentClassification } from './types';

type JsonSchemaFormat = OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'];

const INTENT_VALUES: WriterIntent[] = [
	'write-new',
	'continue',
	'summarize',
	'rewrite',
	'answer',
	'other',
];

export const INTENT_SCHEMA: JsonSchemaFormat = {
	type: 'json_schema',
	json_schema: {
		name: 'writer_intent',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['intent', 'summary'],
			properties: {
				intent: { type: 'string', enum: INTENT_VALUES },
				summary: { type: 'string' },
			},
		},
	},
};

export const DECISION_SCHEMA: JsonSchemaFormat = {
	type: 'json_schema',
	json_schema: {
		name: 'writer_decision',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['action', 'instruction', 'skillName', 'reasoning'],
			properties: {
				action: { type: 'string', enum: ['text', 'skill', 'done'] },
				instruction: { type: ['string', 'null'] },
				skillName: { type: ['string', 'null'] },
				reasoning: { type: ['string', 'null'] },
			},
		},
	},
};

export function parseIntent(raw: string): WriterIntentClassification {
	const parsed = parseJson(raw);
	const value = parsed.intent;
	if (typeof value !== 'string' || !INTENT_VALUES.includes(value as WriterIntent)) {
		throw new Error(`Invalid intent: ${JSON.stringify(value)}`);
	}
	const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
	return { intent: value as WriterIntent, summary };
}

export function parseDecision(raw: string): WriterDecision {
	const parsed = parseJson(raw);
	const action = parsed.action;
	if (action !== 'text' && action !== 'skill' && action !== 'done') {
		throw new Error(`Invalid action: ${JSON.stringify(action)}`);
	}
	return {
		action,
		instruction: typeof parsed.instruction === 'string' ? parsed.instruction : null,
		skillName: typeof parsed.skillName === 'string' ? parsed.skillName : null,
		reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : null,
	};
}

function parseJson(raw: string): Record<string, unknown> {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Empty response');
	try {
		return JSON.parse(trimmed) as Record<string, unknown>;
	} catch {
		const match = /\{[\s\S]*\}/.exec(trimmed);
		if (!match) throw new Error('No JSON object found');
		return JSON.parse(match[0]) as Record<string, unknown>;
	}
}
