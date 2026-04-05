import { HumanMessage } from '@langchain/core/messages';
import { PAINTER_STATE_MESSAGES } from '../messages';
import { readLabeledValue } from '../agent-output';
import {
	createPainterSpecialistAgent,
	invokePainterSpecialist,
	type PainterSpecialistAgent,
} from '../specialist-agent';
import type { PainterGraphState } from '../state';

const SYSTEM_PROMPT = `You are the prompt writer in an image workflow.

Turn the structured visual intent into a single high-quality image generation prompt.
Make the prompt concrete, visual, and production-ready.
When refinement guidance is provided, fix the prompt instead of repeating it.

Return exactly these labels:
PROMPT:
ALT_TEXT:

PROMPT must be one paragraph with no markdown or bullet points.
ALT_TEXT must be a short accessible description of the intended image.`;

function buildHumanMessage(state: PainterGraphState): string {
	return [
		'User request:',
		state.prompt,
		'',
		'Visual goal:',
		state.visualGoal || 'Not provided',
		'',
		'Subject:',
		state.subject || 'Not provided',
		'',
		'Style:',
		state.styleDirection || 'Not provided',
		'',
		'Composition:',
		state.composition || 'Not provided',
		'',
		'Palette:',
		state.palette || 'Not provided',
		'',
		'Aspect ratio:',
		state.aspectRatio,
		'',
		'Previous prompt:',
		state.imagePrompt || 'None',
		'',
		'Refinement guidance:',
		state.refinementGuidance || 'None',
	].join('\n');
}

export function createCreateImagePromptAgent(
	model: PainterSpecialistAgent['model']
): PainterSpecialistAgent {
	return createPainterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function createImagePromptAgent(
	state: PainterGraphState,
	agent: PainterSpecialistAgent
): Promise<Partial<PainterGraphState>> {
	const raw = await invokePainterSpecialist(agent, [new HumanMessage(buildHumanMessage(state))]);
	const nextPrompt = readLabeledValue(raw, 'PROMPT') || state.visualGoal || state.prompt;
	const nextAltText = readLabeledValue(raw, 'ALT_TEXT') || state.imageAltText || 'Generated image';

	return {
		imagePrompt: nextPrompt,
		imageAltText: nextAltText,
		phaseLabel: PAINTER_STATE_MESSAGES.GENERATE_IMAGE,
	};
}
