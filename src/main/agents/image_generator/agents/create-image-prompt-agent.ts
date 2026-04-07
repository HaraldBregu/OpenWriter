import { HumanMessage } from '@langchain/core/messages';
import { IMAGE_GENERATOR_MESSAGES } from '../messages';
import { readLabeledValue } from '../agent-output';
import {
	createImageGeneratorSpecialistAgent,
	invokeImageGeneratorSpecialist,
	type ImageGeneratorSpecialistAgent,
} from '../specialist-agent';
import type { ImageGeneratorState } from '../state';

const SYSTEM_PROMPT = `You are the prompt writer in an image generation workflow.

Turn the structured visual intent into a single high-quality image generation prompt.
Make the prompt concrete, visual, and production-ready for DALL-E.
When refinement guidance is provided, improve the prompt rather than repeating it.

Return exactly these labels:
PROMPT:
ALT_TEXT:

PROMPT must be one paragraph with no markdown or bullet points.
ALT_TEXT must be a short accessible description of the intended image.`;

function buildHumanMessage(state: ImageGeneratorState): string {
	return [
		'User request:',
		state.prompt,
		'',
		'Subject:',
		state.subject || 'Not provided',
		'',
		'Style:',
		state.style || 'Not provided',
		'',
		'Mood:',
		state.mood || 'Not provided',
		'',
		'Resolution:',
		state.resolution,
		'',
		'Previous prompt:',
		state.imagePrompt || 'None',
		'',
		'Refinement guidance:',
		state.refinementGuidance || 'None',
	].join('\n');
}

export function createCreateImagePromptAgent(
	model: ImageGeneratorSpecialistAgent['model']
): ImageGeneratorSpecialistAgent {
	return createImageGeneratorSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function createImagePrompt(
	state: ImageGeneratorState,
	agent: ImageGeneratorSpecialistAgent
): Promise<Partial<ImageGeneratorState>> {
	const raw = await invokeImageGeneratorSpecialist(agent, [
		new HumanMessage(buildHumanMessage(state)),
	]);

	const nextPrompt = readLabeledValue(raw, 'PROMPT') || state.subject || state.prompt;
	const nextAltText =
		readLabeledValue(raw, 'ALT_TEXT') || state.imageAltText || 'Generated image';

	return {
		imagePrompt: nextPrompt,
		imageAltText: nextAltText,
		phaseLabel: IMAGE_GENERATOR_MESSAGES.GENERATE_IMAGE,
	};
}
