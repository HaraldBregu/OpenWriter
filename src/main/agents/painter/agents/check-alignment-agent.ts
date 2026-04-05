import { HumanMessage } from '@langchain/core/messages';
import { PAINTER_STATE_MESSAGES } from '../messages';
import { parseYesNo, readLabeledValue } from '../agent-output';
import {
	createPainterSpecialistAgent,
	invokePainterSpecialist,
	type PainterSpecialistAgent,
} from '../specialist-agent';
import type { PainterGraphState } from '../state';

const SYSTEM_PROMPT = `You are the alignment reviewer in an image workflow.

Review how well the generated image plan matches the user's request.
You are reviewing the request, the generated prompt, and the produced image reference.
Approve the result when the prompt clearly satisfies the request.
If it needs another pass, give precise revision guidance.

Return exactly these labels:
APPROVED:
ALIGNMENT_FINDINGS:
REVISION_GUIDANCE:

APPROVED must be yes or no.`;

function buildHumanMessage(state: PainterGraphState): string {
	return [
		'User request:',
		state.prompt,
		'',
		'Visual goal:',
		state.visualGoal || 'Not provided',
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
	model: PainterSpecialistAgent['model']
): PainterSpecialistAgent {
	return createPainterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function checkAlignmentAgent(
	state: PainterGraphState,
	agent: PainterSpecialistAgent
): Promise<Partial<PainterGraphState>> {
	const raw = await invokePainterSpecialist(agent, [new HumanMessage(buildHumanMessage(state))]);
	const approved = parseYesNo(readLabeledValue(raw, 'APPROVED'), false);
	const needsAnotherPass = !approved && state.revisionCount < state.maxRevisions;

	return {
		alignmentApproved: approved,
		alignmentFindings: readLabeledValue(raw, 'ALIGNMENT_FINDINGS') ?? '',
		refinementGuidance: readLabeledValue(raw, 'REVISION_GUIDANCE') ?? '',
		revisionCount: needsAnotherPass ? state.revisionCount + 1 : state.revisionCount,
		phaseLabel: approved
			? PAINTER_STATE_MESSAGES.DELIVER_IMAGE
			: needsAnotherPass
				? PAINTER_STATE_MESSAGES.CREATE_IMAGE_PROMPT
				: PAINTER_STATE_MESSAGES.DELIVER_IMAGE,
	};
}
