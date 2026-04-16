import type { AgentHistoryMessage } from '../core/types';

export type PainterAspectRatio = 'auto' | 'square' | 'portrait' | 'landscape';

export interface PainterGraphState {
	prompt: string;
	history: AgentHistoryMessage[];
	visualGoal: string;
	subject: string;
	styleDirection: string;
	composition: string;
	palette: string;
	aspectRatio: PainterAspectRatio;
	imagePrompt: string;
	imageAltText: string;
	alignmentFindings: string;
	refinementGuidance: string;
	alignmentApproved: boolean;
	generatedImagePath: string;
	generatedImageUrl: string;
	revisionCount: number;
	maxRevisions: number;
	phaseLabel: string;
	response: string;
}
