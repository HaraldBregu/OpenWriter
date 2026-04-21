import type { ControllerDecision } from './state';

const ACTION_VALUES = ['text', 'image', 'skill', 'done'] as const;

export const CONTROLLER_JSON_SCHEMA = {
	name: 'assistant_controller_decision',
	strict: true,
	schema: {
		type: 'object',
		additionalProperties: false,
		properties: {
			action: { type: 'string', enum: ACTION_VALUES },
			reason: { type: 'string' },
			instruction: { type: ['string', 'null'] },
			imagePrompt: { type: ['string', 'null'] },
			skillName: { type: ['string', 'null'] },
			toolsAllowlist: {
				type: ['array', 'null'],
				items: { type: 'string' },
			},
		},
		required: ['action', 'reason', 'instruction', 'imagePrompt', 'skillName', 'toolsAllowlist'],
	},
} as const;

export interface DecisionParseResult {
	decision?: ControllerDecision;
	error?: string;
}

export function validateDecision(value: unknown): DecisionParseResult {
	if (!value || typeof value !== 'object') {
		return { error: 'decision must be an object' };
	}
	const raw = value as Record<string, unknown>;
	const action = raw.action;
	if (action !== 'text' && action !== 'image' && action !== 'skill' && action !== 'done') {
		return { error: `unknown action: ${String(action)}` };
	}

	const decision: ControllerDecision = {
		action,
		reason: readOptionalString(raw.reason),
		instruction: readOptionalString(raw.instruction),
		imagePrompt: readOptionalString(raw.imagePrompt),
		skillName: readOptionalString(raw.skillName),
		toolsAllowlist: readOptionalStringArray(raw.toolsAllowlist),
	};

	if (action === 'image' && !decision.imagePrompt) {
		return { error: 'image action requires imagePrompt' };
	}
	if (action === 'skill' && !decision.skillName) {
		return { error: 'skill action requires skillName' };
	}
	return { decision };
}

function readOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const out = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
	return out.length > 0 ? out : undefined;
}
