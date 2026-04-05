import { PAINTER_STATE_MESSAGES } from '../messages';
import type { PainterGraphState } from '../state';

function quoteBlock(value: string): string {
	return value
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

export async function deliverImageAgent(
	state: PainterGraphState
): Promise<Partial<PainterGraphState>> {
	const lines: string[] = [];

	if (state.generatedImageUrl) {
		lines.push(`![${state.imageAltText || 'Generated image'}](<${state.generatedImageUrl}>)`);
		lines.push('');
	}

	lines.push(`Saved image: \`${state.generatedImagePath}\``);

	if (state.alignmentFindings) {
		lines.push('');
		lines.push(state.alignmentApproved ? 'Alignment check:' : 'Best-effort alignment check:');
		lines.push('');
		lines.push(quoteBlock(state.alignmentFindings));
	}

	if (state.imagePrompt) {
		lines.push('');
		lines.push('Prompt used:');
		lines.push('');
		lines.push(quoteBlock(state.imagePrompt));
	}

	return {
		phaseLabel: PAINTER_STATE_MESSAGES.DELIVER_IMAGE,
		response: lines.join('\n').trim(),
	};
}
