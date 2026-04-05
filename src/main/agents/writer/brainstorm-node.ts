import { streamWriterNode, type WriterNodeContext } from './shared';

const BRAINSTORM_SYSTEM_PROMPT = `You are the brainstorming specialist in a writing workflow.
Generate concrete and useful ideas for the user's request.
Prefer strong options over generic filler.
When helpful, include titles, hooks, angles, and next-step suggestions.
Keep the output easy to scan.`;

export function streamWriterBrainstormNode(input: WriterNodeContext): AsyncGenerator<string> {
	return streamWriterNode({
		...input,
		systemPrompt: BRAINSTORM_SYSTEM_PROMPT,
		temperature: Math.max(input.temperature, 0.8),
		maxTokens: input.maxTokens,
	});
}
