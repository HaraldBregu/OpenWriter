import { HumanMessage } from '@langchain/core/messages';
import { IMAGE_GENERATOR_MESSAGES } from '../messages';
import { parseYesNo, readLabeledValue } from '../agent-output';
import {
	createImageGeneratorSpecialistAgent,
	invokeImageGeneratorSpecialist,
	type ImageGeneratorSpecialistAgent,
} from '../specialist-agent';
import type { ImageGeneratorState } from '../state';

const SYSTEM_PROMPT = `You are the alignment reviewer in an image generation workflow.

Review how well the generated image plan matches the user's request.
You are reviewing the request, the generated prompt, and the produced image reference.
Approve the result when the prompt clearly satisfies the request.
If it needs another pass, provide precise revision guidance.

Return exactly these labels:
APPROVED:
ALIGNMENT_FINDINGS:
REVISION_GUIDANCE:

APPROVED must be yes or no.`;

function buildHumanMessage(state: ImageGeneratorState): string {
	return [
		'User request:',
		state.prompt,
		'',
		'Subject:',
		state.subject || 'Not provided',
		'',
		'Generated prompt:',
		state.imagePrompt || 'Not provided',
		'',
		'Generated image path:',
		state.generatedImagePath || 'Not available',
		'',
		'Current revision count:',
		`${state.revisionCount} of ${state.maxRevisions}`,
	].join('\n');
}

export function createCheckAlignmentAgent(
	model: ImageGeneratorSpecialistAgent['model']
): ImageGeneratorSpecialistAgent {
	return createImageGeneratorSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function checkAlignment(
	state: ImageGeneratorState,
	agent: ImageGeneratorSpecialistAgent
): Promise<Partial<ImageGeneratorState>> {
	const raw = await invokeImageGeneratorSpecialist(agent, [
		new HumanMessage(buildHumanMessage(state)),
	]);

	const approved = parseYesNo(readLabeledValue(raw, 'APPROVED'), false);
	const needsAnotherPass = !approved && state.revisionCount < state.maxRevisions;

	return {
		alignmentApproved: approved,
		alignmentFindings: readLabeledValue(raw, 'ALIGNMENT_FINDINGS') ?? '',
		refinementGuidance: readLabeledValue(raw, 'REVISION_GUIDANCE') ?? '',
		revisionCount: needsAnotherPass ? state.revisionCount + 1 : state.revisionCount,
		phaseLabel: approved
			? IMAGE_GENERATOR_MESSAGES.DELIVER_IMAGE
			: needsAnotherPass
				? IMAGE_GENERATOR_MESSAGES.CREATE_IMAGE_PROMPT
				: IMAGE_GENERATOR_MESSAGES.DELIVER_IMAGE,
	};
}
