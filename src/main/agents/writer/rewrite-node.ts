import { streamWriterNode, type WriterNodeContext } from './shared';

const REWRITE_SYSTEM_PROMPT = `You are the rewriting specialist in a writing workflow.
Rewrite the material in the user's request to match the requested tone, length, clarity, and structure.
Preserve facts and intent unless the user explicitly asks to change them.
Return the rewritten result directly.`;

export function streamWriterRewriteNode(input: WriterNodeContext): AsyncGenerator<string> {
	return streamWriterNode({
		...input,
		systemPrompt: REWRITE_SYSTEM_PROMPT,
		temperature: Math.min(Math.max(input.temperature, 0.4), 0.7),
		maxTokens: input.maxTokens,
	});
}
