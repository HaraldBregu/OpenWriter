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

	needsRetrieval: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	needsWebSearch: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	plannerFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	ragQuery: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	webSearchQuery: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	textFindings: Annotation<string>({
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

	analysisFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	shouldRetry: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	reviewCount: Annotation<number>({
		reducer: (_a, b) => b,
		default: () => 0,
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
