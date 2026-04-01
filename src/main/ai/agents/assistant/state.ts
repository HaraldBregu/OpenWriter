import { Annotation } from '@langchain/langgraph';
import type { AgentHistoryMessage } from '../../core/types';

export const AssistantState = Annotation.Root({
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	history: Annotation<AgentHistoryMessage[]>({
		reducer: (_a, b) => b,
		default: () => [],
	}),

	intent: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => 'conversation',
	}),

	phaseLabel: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	response: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	/**
	 * Concatenated text from vector store documents retrieved for the current
	 * prompt. Empty string when no workspace is open or the vector store has
	 * not been built yet. Populated by the rag-node before specialist nodes run.
	 */
	ragContext: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
});
