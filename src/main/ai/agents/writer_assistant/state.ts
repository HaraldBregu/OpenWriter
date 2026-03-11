/**
 * Graph state annotation for the Writer Assistant agent.
 */

import { Annotation } from '@langchain/langgraph';

export type ContentLength = 'short' | 'medium' | 'long';

export const WriterState = Annotation.Root({
	content: Annotation<string>({
		reducer: (_, next) => next,
		default: () => '',
	}),
	contentLength: Annotation<ContentLength>({
		reducer: (_, next) => next,
		default: () => 'short' as ContentLength,
	}),
	completion: Annotation<string>({
		reducer: (_, next) => next,
		default: () => '',
	}),
});
