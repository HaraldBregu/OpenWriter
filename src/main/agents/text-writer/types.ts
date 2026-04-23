import type { Skill } from '../skills';

export type TextWriterIntent = 'compose' | 'transform' | 'answer' | 'other';

export interface TextWriterIntentClassification {
	intent: TextWriterIntent;
	summary: string;
}

export type TextWriterPath = 'direct' | 'skilled' | 'exhaustive';

export interface TextWriterRoute {
	path: TextWriterPath;
	reasoning: string;
}

export interface TextWriterSkillSelection {
	skillName: string | null;
	instruction: string;
	reasoning: string;
}

export type TextWriterSkill = Skill;

export interface TextWriterAgentInput {
	prompt: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
	/** Optional skills catalog; selector may pick one. */
	skills?: TextWriterSkill[];
	/** Per-LLM-call timeout in ms. Default 90_000. */
	perCallTimeoutMs?: number;
}

export interface TextWriterAgentOutput {
	content: string;
	path: TextWriterPath;
	intent: TextWriterIntent | null;
	skillName: string | null;
	stoppedReason: 'done';
}
