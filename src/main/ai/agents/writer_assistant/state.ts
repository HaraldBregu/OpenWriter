/**
 * Graph state annotation for the TextContinuation agent.
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const GraphState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (existing, update) => existing.concat(update),
		default: () => [],
	}),
	insertion: Annotation<string>({
		reducer: (_, next) => next,
		default: () => '',
	}),
});

export type TextContinuationState = typeof GraphState.State;
