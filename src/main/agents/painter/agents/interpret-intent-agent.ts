import { HumanMessage } from '@langchain/core/messages';
import { PAINTER_STATE_MESSAGES } from '../messages';
import { readLabeledValue } from '../agent-output';
import {
	createPainterSpecialistAgent,
	invokePainterSpecialist,
	type PainterSpecialistAgent,
} from '../specialist-agent';
import type { PainterAspectRatio, PainterGraphState } from '../state';

const SYSTEM_PROMPT = `You are the intent interpreter in an image workflow.

Read the user's request and extract the visual target as concise labeled fields.

Return exactly these labels:
VISUAL_GOAL:
SUBJECT:
STYLE:
COMPOSITION:
PALETTE:
ASPECT_RATIO:
ALT_TEXT:

ASPECT_RATIO must be one of: auto, square, portrait, landscape.
Keep each value short, specific, and directly useful for image generation.`;

function clampAspectRatio(value: string | undefined): PainterAspectRatio {
	switch ((value ?? '').trim().toLowerCase()) {
		case 'square':
			return 'square';
		case 'portrait':
			return 'portrait';
		case 'landscape':
			return 'landscape';
		default:
			return 'auto';
	}
}

function buildHistory(history: PainterGraphState['history']): string {
	if (history.length === 0) return 'None';
	return history
		.slice(-6)
		.map((entry, index) => `${index + 1}. ${entry.role.toUpperCase()}: ${entry.content}`)
		.join('\n');
}

function buildHumanMessage(state: PainterGraphState): string {
	return ['User request:', state.prompt, '', 'Recent history:', buildHistory(state.history)].join(
		'\n'
	);
}

export function createInterpretIntentAgent(
	model: PainterSpecialistAgent['model']
): PainterSpecialistAgent {
	return createPainterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function interpretIntentAgent(
	state: PainterGraphState,
	agent: PainterSpecialistAgent
): Promise<Partial<PainterGraphState>> {
	const raw = await invokePainterSpecialist(agent, [new HumanMessage(buildHumanMessage(state))]);

	return {
		visualGoal: readLabeledValue(raw, 'VISUAL_GOAL') ?? state.prompt,
		subject: readLabeledValue(raw, 'SUBJECT') ?? '',
		styleDirection: readLabeledValue(raw, 'STYLE') ?? '',
		composition: readLabeledValue(raw, 'COMPOSITION') ?? '',
		palette: readLabeledValue(raw, 'PALETTE') ?? '',
		aspectRatio: clampAspectRatio(readLabeledValue(raw, 'ASPECT_RATIO')),
		imageAltText: readLabeledValue(raw, 'ALT_TEXT') ?? 'Generated image',
		phaseLabel: PAINTER_STATE_MESSAGES.CREATE_IMAGE_PROMPT,
	};
}
