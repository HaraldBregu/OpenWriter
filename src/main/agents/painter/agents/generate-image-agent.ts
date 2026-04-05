import type { PainterGraphState } from '../state';
import { PAINTER_STATE_MESSAGES } from '../messages';

export interface PainterImageGenerator {
	generate(state: PainterGraphState): Promise<{
		filePath: string;
		localUrl: string;
	}>;
}

export async function generateImageAgent(
	state: PainterGraphState,
	imageGenerator: PainterImageGenerator
): Promise<Partial<PainterGraphState>> {
	const generated = await imageGenerator.generate(state);

	return {
		generatedImagePath: generated.filePath,
		generatedImageUrl: generated.localUrl,
		phaseLabel: PAINTER_STATE_MESSAGES.CHECK_ALIGNMENT,
	};
}
