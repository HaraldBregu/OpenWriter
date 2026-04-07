import { HumanMessage } from '@langchain/core/messages';
import { IMAGE_GENERATOR_MESSAGES } from '../messages';
import { readLabeledValue, parsePositiveInt } from '../agent-output';
import {
	createImageGeneratorSpecialistAgent,
	invokeImageGeneratorSpecialist,
	type ImageGeneratorSpecialistAgent,
} from '../specialist-agent';
import type { ImageGeneratorState, ImageResolution } from '../state';
import { DEFAULT_NUMBER_OF_IMAGES, DEFAULT_RESOLUTION } from '../state';

const SYSTEM_PROMPT = `You are the intent interpreter in an image generation workflow.

Read the user's request and extract the image intent as concise labeled fields.

Return exactly these labels:
SUBJECT:
STYLE:
MOOD:
RESOLUTION:
NUMBER_OF_IMAGES:
ALT_TEXT:

RESOLUTION must be one of: 1024x1024, 1024x1536, 1536x1024.
  - Use 1024x1024 for square or unspecified images.
  - Use 1024x1536 for portrait/vertical images.
  - Use 1536x1024 for landscape/horizontal images.
NUMBER_OF_IMAGES must be a positive integer (typically 1).
Keep each value short, specific, and directly useful for image generation.`;

const VALID_RESOLUTIONS: readonly ImageResolution[] = [
	'1024x1024',
	'1024x1536',
	'1536x1024',
] as const;

function clampResolution(value: string | undefined): ImageResolution {
	const trimmed = (value ?? '').trim() as ImageResolution;
	return VALID_RESOLUTIONS.includes(trimmed) ? trimmed : DEFAULT_RESOLUTION;
}

function buildHistory(history: ImageGeneratorState['history']): string {
	if (history.length === 0) return 'None';
	return history
		.slice(-6)
		.map((entry, index) => `${index + 1}. ${entry.role.toUpperCase()}: ${entry.content}`)
		.join('\n');
}

function buildHumanMessage(state: ImageGeneratorState): string {
	return [
		'User request:',
		state.prompt,
		'',
		'Recent history:',
		buildHistory(state.history),
	].join('\n');
}

export function createInterpretIntentAgent(
	model: ImageGeneratorSpecialistAgent['model']
): ImageGeneratorSpecialistAgent {
	return createImageGeneratorSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function interpretIntent(
	state: ImageGeneratorState,
	agent: ImageGeneratorSpecialistAgent
): Promise<Partial<ImageGeneratorState>> {
	const raw = await invokeImageGeneratorSpecialist(agent, [
		new HumanMessage(buildHumanMessage(state)),
	]);

	return {
		subject: readLabeledValue(raw, 'SUBJECT') ?? '',
		style: readLabeledValue(raw, 'STYLE') ?? '',
		mood: readLabeledValue(raw, 'MOOD') ?? '',
		resolution: clampResolution(readLabeledValue(raw, 'RESOLUTION')),
		numberOfImages: parsePositiveInt(
			readLabeledValue(raw, 'NUMBER_OF_IMAGES'),
			DEFAULT_NUMBER_OF_IMAGES
		),
		imageAltText: readLabeledValue(raw, 'ALT_TEXT') ?? 'Generated image',
		phaseLabel: IMAGE_GENERATOR_MESSAGES.CREATE_IMAGE_PROMPT,
	};
}
