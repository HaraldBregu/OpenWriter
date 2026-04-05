import { Annotation } from '@langchain/langgraph';
import type { AgentHistoryMessage } from '../core/types';

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

	intentFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	intentCategory: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => 'question',
	}),

	needsParallelResearch: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	needsRetrieval: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	needsWebSearch: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	ragQuery: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	webSearchQuery: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	ragFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	webFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
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
