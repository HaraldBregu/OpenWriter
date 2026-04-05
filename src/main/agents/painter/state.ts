import { Annotation } from '@langchain/langgraph';
import type { AgentHistoryMessage } from '../core/types';

export type PainterAspectRatio = 'auto' | 'square' | 'portrait' | 'landscape';

export const PainterState = Annotation.Root({
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	history: Annotation<AgentHistoryMessage[]>({
		reducer: (_a, b) => b,
		default: () => [],
	}),

	visualGoal: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	subject: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	styleDirection: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	composition: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	palette: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	aspectRatio: Annotation<PainterAspectRatio>({
		reducer: (_a, b) => b,
		default: () => 'auto',
	}),

	imagePrompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	imageAltText: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	alignmentFindings: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	refinementGuidance: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	alignmentApproved: Annotation<boolean>({
		reducer: (_a, b) => b,
		default: () => false,
	}),

	generatedImagePath: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	generatedImageUrl: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	revisionCount: Annotation<number>({
		reducer: (_a, b) => b,
		default: () => 0,
	}),

	maxRevisions: Annotation<number>({
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

export type PainterGraphState = typeof PainterState.State;
