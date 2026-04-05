import { streamWriterNode, type WriterNodeContext } from './shared';

const DRAFT_SYSTEM_PROMPT = `You are the drafting specialist in a writing workflow.
Write polished, ready-to-use prose for the user's request.
Do not explain your process.
Maintain a strong structure, natural pacing, and consistent tone.`;

export function streamWriterDraftNode(
	input: WriterNodeContext,
	outline: string
): AsyncGenerator<string> {
	return streamWriterNode({
		...input,
		systemPrompt: DRAFT_SYSTEM_PROMPT,
		userContext: [`Approved outline:\n${outline}`],
		temperature: Math.max(input.temperature, 0.6),
		maxTokens: input.maxTokens,
	});
}
