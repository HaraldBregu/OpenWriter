export type WriterIntent =
	| 'write-new'
	| 'continue'
	| 'summarize'
	| 'rewrite'
	| 'answer'
	| 'other';

export interface WriterIntentClassification {
	intent: WriterIntent;
	summary: string;
}

export type WriterAction = 'text' | 'skill' | 'done';

export interface WriterDecision {
	action: WriterAction;
	instruction: string | null;
	skillName: string | null;
	reasoning: string | null;
}

export interface WriterSkill {
	name: string;
	description: string;
	instructions: string;
}

export interface WriterAgentInput {
	prompt: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
	/** Optional skills catalog; writer controller may pick one. */
	skills?: WriterSkill[];
	/** Maximum controller iterations. Default 3. */
	maxSteps?: number;
	/** Per-LLM-call timeout in ms. Default 90_000. */
	perCallTimeoutMs?: number;
}

export interface WriterAgentOutput {
	content: string;
	intent: WriterIntent;
	steps: number;
	stoppedReason: 'done' | 'max-steps';
}
