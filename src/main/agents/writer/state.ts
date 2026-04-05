import { Annotation } from '@langchain/langgraph';
import type { AgentHistoryMessage } from '../core/types';

export const WRITER_INTENT = {
	CONTINUE: 'continue',
	IMPROVE: 'improve',
	TRANSFORM: 'transform',
	EXPAND: 'expand',
	CONDENSE: 'condense',
	UNCLEAR: 'unclear',
} as const;

export type WriterIntent = (typeof WRITER_INTENT)[keyof typeof WRITER_INTENT];

export const WriterState = Annotation.Root({
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

	intent: Annotation<WriterIntent>({
		reducer: (_a, b) => b,
		default: () => WRITER_INTENT.UNCLEAR,
	}),

	intentFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	audienceGuidance: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	toneGuidance: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	lengthGuidance: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	draftResponse: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	alignedResponse: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	reviewFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	needsRefinement: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	refinementGuidance: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	revisionCount: Annotation<number>({
		reducer: (_a, b) => b,
		default: () => 0,
	}),

	maxRefinements: Annotation<number>({
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
