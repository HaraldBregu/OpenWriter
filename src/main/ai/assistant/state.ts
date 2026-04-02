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

	ragFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	grammarFindings: Annotation<string>({
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
