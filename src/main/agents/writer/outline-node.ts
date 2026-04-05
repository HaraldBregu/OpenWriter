import { completeWriterNode, streamWriterNode, type WriterNodeContext } from './shared';

const OUTLINE_SYSTEM_PROMPT = `You are the outlining specialist in a writing workflow.
Create a clear, practical outline for the user's request.
Use concise headings and supporting bullet points.
Make the structure immediately usable for drafting.`;

export function runWriterOutlineNode(input: WriterNodeContext): Promise<string> {
	return completeWriterNode({
		...input,
		systemPrompt: OUTLINE_SYSTEM_PROMPT,
		temperature: Math.min(input.temperature, 0.4),
		maxTokens: Math.min(input.maxTokens ?? 1200, 1200),
	});
}

export function streamWriterOutlineNode(input: WriterNodeContext): AsyncGenerator<string> {
	return streamWriterNode({
		...input,
		systemPrompt: OUTLINE_SYSTEM_PROMPT,
		temperature: Math.min(input.temperature, 0.4),
		maxTokens: input.maxTokens,
	});
}
