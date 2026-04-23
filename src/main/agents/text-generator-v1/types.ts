/**
 * TextGeneratorV1 — AI-powered editor agent built on the OpenAI Responses API.
 *
 * Understands structured editing prompts (`<selected_text>...</selected_text>
 * <prompt>...</prompt>`), classifies intent, selects skills by rule, then
 * delegates execution to the `shell` tool with skill references attached.
 */

export type TextGeneratorV1Intent =
	| 'continue'
	| 'edit'
	| 'rewrite'
	| 'summarize'
	| 'analyze';

export type TextGeneratorV1Target = 'selection' | 'full';

export interface TextGeneratorV1ParsedInput {
	selectedText?: string;
	prompt: string;
	fullText: string;
}

export interface TextGeneratorV1IntentClassification {
	intent: TextGeneratorV1Intent;
	target: TextGeneratorV1Target;
	style?: string;
	operation: string;
}

export interface TextGeneratorV1Context {
	parsed: TextGeneratorV1ParsedInput;
	classification: TextGeneratorV1IntentClassification;
	operateOn: string;
}

export interface TextGeneratorV1SkillIdEntry {
	name: string;
	skillId: string;
}

export interface TextGeneratorV1ExecutionOutput {
	result: string;
	responseId: string;
	usedSkillIds: string[];
}

export interface TextGeneratorV1AgentInput {
	/** Raw document possibly containing `<selected_text>` and `<prompt>` tags. */
	raw: string;
	providerId: string;
	apiKey: string;
	/** Model for intent classification + execution. Default `gpt-5.2`. */
	modelName?: string;
	/** Skill name → skill_id map (uploaded skills). */
	skillIds?: Record<string, string>;
	/** Path to JSON file with `{ name: skill_id }` mapping. Loaded if `skillIds` absent. */
	skillIdRegistryPath?: string;
	/** Per-LLM-call timeout in ms. Default 120_000. */
	perCallTimeoutMs?: number;
	/** Emit text deltas during execution. Default false. */
	stream?: boolean;
}

export interface TextGeneratorV1AgentOutput {
	finalDocument: string;
	intent: TextGeneratorV1Intent;
	target: TextGeneratorV1Target;
	selectedSkillNames: string[];
	selectedSkillIds: string[];
	responseId: string;
	classification: TextGeneratorV1IntentClassification;
	rawResult: string;
}
