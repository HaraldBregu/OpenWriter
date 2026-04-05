import { Annotation } from '@langchain/langgraph';
import type { AgentHistoryMessage } from '../core/types';

export type AssistantRouteDecision = 'direct' | 'rag';
export type AssistantRetrievalStatus = 'idle' | 'found' | 'empty' | 'unavailable';

export const AssistantState = Annotation.Root({
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	history: Annotation<AgentHistoryMessage[]>({
		reducer: (_a, b) => b,
		default: () => [],
	}),

	normalizedPrompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	routingFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	routeDecision: Annotation<AssistantRouteDecision>({
		reducer: (_a, b) => b,
		default: () => 'direct',
	}),

	retrievalQuery: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	retrievedContext: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	retrievalStatus: Annotation<AssistantRetrievalStatus>({
		reducer: (_a, b) => b,
		default: () => 'idle',
	}),

	documentsRelevant: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	gradeFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	retryCount: Annotation<number>({
		reducer: (_a, b) => b,
		default: () => 0,
	}),

	maxRetries: Annotation<number>({
		reducer: (_a, b) => b,
		default: () => 2,
	}),

	phaseLabel: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	response: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
});

export type AssistantGraphState = typeof AssistantState.State;
export type AssistantGraphUpdate = Partial<AssistantGraphState>;
