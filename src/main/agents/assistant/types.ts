import type { Skill } from '../skills';

export interface AssistantFile {
	name: string;
	mimeType?: string;
	path?: string;
	dataUrl?: string;
}

export interface AssistantAgentInput {
	prompt: string;
	files?: AssistantFile[];
	providerId: string;
	apiKey: string;
	modelName: string;
	documentId: string;
	documentPath: string;
	/** Absolute path to the workspace root. Generated images land in `{workspacePath}/images/`. */
	workspacePath?: string;
	imageProviderId?: string;
	imageApiKey?: string;
	imageModelName?: string;
	temperature?: number;
	maxTokens?: number;

	/** Deprecated. Falls back for both controller + text loops. */
	maxIterations?: number;

	/** Maximum outer controller steps. */
	maxControllerSteps?: number;
	/** Maximum inner tool-call iterations per text-node invocation. */
	maxTextIterations?: number;
	/** Total prompt+completion tokens allowed for the entire run. */
	maxTotalTokens?: number;
	/** Wall-clock ceiling for the entire run. */
	runTimeoutMs?: number;
	/** Per-LLM-call timeout (merged with run + caller abort signal). */
	perCallTimeoutMs?: number;
	/** Consecutive identical decisions before the agent halts with a partial result. */
	stagnationWindow?: number;

	/** Skills available to the controller. Injected by AgentTaskHandler. */
	skills?: Skill[];
}

export interface AssistantToolCallRecord {
	name: string;
	argumentsRaw: string;
	output: string;
	error?: string;
}

export interface AssistantUsageTotals {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

export interface AssistantAgentOutput {
	content: string;
	toolCalls: AssistantToolCallRecord[];
	iterations: number;
	usage: AssistantUsageTotals;
	stoppedReason: 'done' | 'max-steps' | 'stagnation' | 'budget' | 'aborted' | 'error';
}
