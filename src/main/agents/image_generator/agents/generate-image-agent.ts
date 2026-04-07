import { IMAGE_GENERATOR_MESSAGES } from '../messages';
import { generateImage } from '../image-generation';
import type { ImageGeneratorState } from '../state';
import type { LoggerService } from '../../../services/logger';

interface GenerateImageAgentInput {
	readonly apiKey: string;
	readonly baseUrl?: string;
	readonly signal?: AbortSignal;
	readonly metadata?: Record<string, unknown>;
	readonly workspacePath?: string | null;
	readonly logger?: LoggerService;
}

export async function generateImageStep(
	state: ImageGeneratorState,
	input: GenerateImageAgentInput
): Promise<Partial<ImageGeneratorState>> {
	const generated = await generateImage({
		prompt: state.imagePrompt,
		resolution: state.resolution,
		apiKey: input.apiKey,
		baseUrl: input.baseUrl,
		signal: input.signal,
		metadata: input.metadata,
		workspacePath: input.workspacePath,
		logger: input.logger,
	});

	return {
		generatedImagePath: generated.filePath,
		generatedImageUrl: generated.localUrl,
		phaseLabel: IMAGE_GENERATOR_MESSAGES.CHECK_ALIGNMENT,
	};
}
