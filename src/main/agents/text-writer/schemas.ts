import type OpenAI from 'openai';
import type {
	TextWriterIntent,
	TextWriterIntentClassification,
	TextWriterPath,
	TextWriterRoute,
	TextWriterSkillSelection,
} from './types';

type JsonSchemaFormat = OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'];

const INTENT_VALUES: TextWriterIntent[] = ['compose', 'transform', 'answer', 'other'];
const PATH_VALUES: TextWriterPath[] = ['direct', 'skilled', 'exhaustive'];

export const ROUTE_SCHEMA: JsonSchemaFormat = {
	type: 'json_schema',
	json_schema: {
		name: 'text_writer_route',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['path', 'reasoning'],
			properties: {
				path: { type: 'string', enum: PATH_VALUES },
				reasoning: { type: 'string' },
			},
		},
	},
};

export const INTENT_SCHEMA: JsonSchemaFormat = {
	type: 'json_schema',
	json_schema: {
		name: 'text_writer_intent',
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

export const SKILL_SELECTION_SCHEMA: JsonSchemaFormat = {
	type: 'json_schema',
	json_schema: {
		name: 'text_writer_skill_selection',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['skillName', 'instruction', 'reasoning'],
			properties: {
				skillName: { type: ['string', 'null'] },
				instruction: { type: 'string' },
				reasoning: { type: 'string' },
			},
		},
	},
};

export function parseRoute(raw: string): TextWriterRoute {
	const parsed = parseJson(raw);
	const path = parsed.path;
	if (typeof path !== 'string' || !PATH_VALUES.includes(path as TextWriterPath)) {
		throw new Error(`Invalid path: ${JSON.stringify(path)}`);
	}
	const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
	return { path: path as TextWriterPath, reasoning };
}

export function parseIntent(raw: string): TextWriterIntentClassification {
	const parsed = parseJson(raw);
	const value = parsed.intent;
	if (typeof value !== 'string' || !INTENT_VALUES.includes(value as TextWriterIntent)) {
		throw new Error(`Invalid intent: ${JSON.stringify(value)}`);
	}
	const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
	return { intent: value as TextWriterIntent, summary };
}

export function parseSkillSelection(raw: string): TextWriterSkillSelection {
	const parsed = parseJson(raw);
	const skillName =
		typeof parsed.skillName === 'string' && parsed.skillName.trim() ? parsed.skillName : null;
	const instruction = typeof parsed.instruction === 'string' ? parsed.instruction : '';
	const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
	return { skillName, instruction, reasoning };
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
