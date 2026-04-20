import type { ChatMessage } from '../../shared/ai-types';
import type { AgentTool } from '../tools';

export interface TextAgentInput {
	messages: ChatMessage[];
	providerId: string;
	apiKey: string;
	modelName: string;
	temperature?: number;
	maxTokens?: number;
	streaming?: boolean;
	/**
	 * Optional tool registry. When non-empty the agent runs a
	 * tool-calling loop (ReAct-style) instead of a single LLM call.
	 * Streaming is disabled in the tool-loop path.
	 */
	tools?: AgentTool[];
	/** Iteration cap for the tool loop. Default: 10. */
	maxIterations?: number;
	/** Optional system prompt prepended only when messages[0].role !== 'system'. */
	toolSystemPrompt?: string;
}

export interface ToolCallRecord {
	name: string;
	argumentsRaw: string;
	output: string;
	error?: string;
}

export interface TextAgentOutput {
	content: string;
	tokensStreamed: number;
	/** Populated only when tools were executed. */
	toolCalls?: ToolCallRecord[];
	/** Number of LLM round trips in the tool loop (1 when no tools). */
	iterations?: number;
}
