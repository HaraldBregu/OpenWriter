import type { AgentHistoryMessage } from '../core/types';

export type ImageResolution = '1024x1024' | '1024x1536' | '1536x1024';

export interface ImageGeneratorState {
	readonly prompt: string;
	readonly history: AgentHistoryMessage[];
	readonly subject: string;
	readonly style: string;
	readonly mood: string;
	readonly resolution: ImageResolution;
	readonly numberOfImages: number;
	readonly imagePrompt: string;
	readonly imageAltText: string;
	readonly alignmentFindings: string;
	readonly refinementGuidance: string;
	readonly alignmentApproved: boolean;
	readonly generatedImagePath: string;
	readonly generatedImageUrl: string;
	readonly revisionCount: number;
	readonly maxRevisions: number;
	readonly phaseLabel: string;
	readonly response: string;
}

export const DEFAULT_MAX_REVISIONS = 2;
export const DEFAULT_NUMBER_OF_IMAGES = 1;
export const DEFAULT_RESOLUTION: ImageResolution = '1024x1024';

export function createInitialState(
	prompt: string,
	history: AgentHistoryMessage[],
	initialPhaseLabel: string
): ImageGeneratorState {
	return {
		prompt,
		history,
		subject: '',
		style: '',
		mood: '',
		resolution: DEFAULT_RESOLUTION,
		numberOfImages: DEFAULT_NUMBER_OF_IMAGES,
		imagePrompt: '',
		imageAltText: '',
		alignmentFindings: '',
		refinementGuidance: '',
		alignmentApproved: false,
		generatedImagePath: '',
		generatedImageUrl: '',
		revisionCount: 0,
		maxRevisions: DEFAULT_MAX_REVISIONS,
		phaseLabel: initialPhaseLabel,
		response: '',
	};
}

export function applyPatch(
	state: ImageGeneratorState,
	patch: Partial<ImageGeneratorState>
): ImageGeneratorState {
	return { ...state, ...patch };
}
