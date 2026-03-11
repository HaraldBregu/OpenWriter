/**
 * Graph state annotation for the Writer Assistant agent.
 */

import { Annotation } from '@langchain/langgraph';

export const WriterState = Annotation.Root({
	inputText: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	type: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => 'continue_writing',
	}),
	content: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
	contentLength: Annotation<'short' | 'medium' | 'long'>({
		reducer: (_a, b) => b,
		default: () => 'short',
	}),
	completion: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
});
