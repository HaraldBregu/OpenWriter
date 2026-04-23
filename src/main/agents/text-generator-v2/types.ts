export type TextGeneratorV2Intent =
	| 'continue'
	| 'edit'
	| 'rewrite'
	| 'summarize'
	| 'analyze';

export type TextGeneratorV2Target = 'selection' | 'full';

export interface TextGeneratorV2ParsedInput {
	selectedText?: string;
	prompt: string;
	fullText: string;
}

export interface TextGeneratorV2IntentClassification {
	intent: TextGeneratorV2Intent;
	target: TextGeneratorV2Target;
	style?: string;
	operation: string;
}

export interface TextGeneratorV2Context {
	parsed: TextGeneratorV2ParsedInput;
	classification: TextGeneratorV2IntentClassification;
	operateOn: string;
}

export interface TextGeneratorV2SkillIdEntry {
	name: string;
	skillId: string;
}

export interface TextGeneratorV2ExecutionOutput {
	result: string;
	responseId: string;
	usedSkillIds: string[];
}

export interface TextGeneratorV2AgentInput {
	raw: string;
	providerId: string;
	apiKey: string;
	modelName?: string;
	skillIds?: Record<string, string>;
	skillIdRegistryPath?: string;
	perCallTimeoutMs?: number;
	stream?: boolean;
}

export interface TextGeneratorV2AgentOutput {
	content: string;
	finalDocument: string;
	intent: TextGeneratorV2Intent;
	target: TextGeneratorV2Target;
	selectedSkillNames: string[];
	selectedSkillIds: string[];
	missingSkillNames: string[];
	responseId: string;
	classification: TextGeneratorV2IntentClassification;
	rawResult: string;
	stoppedReason: 'done';
}

