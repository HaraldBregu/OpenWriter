import { completeWriterNode, type WriterNodeContext } from './shared';

export type WriterRoute = 'brainstorm' | 'outline' | 'draft' | 'rewrite';

export interface WriterRouteDecision {
	route: WriterRoute;
	reason: string;
}

const ROUTER_SYSTEM_PROMPT = `You are the router node for a writing workflow.
Read the user's latest request and choose exactly one route.

Routes:
- brainstorm: the user wants ideas, topics, titles, hooks, examples, or directions.
- outline: the user wants a structure, plan, sections, beats, or a table of contents.
- draft: the user wants new writing from scratch.
- rewrite: the user wants to revise, continue, shorten, expand, simplify, polish, or change tone of existing writing.

Respond with exactly two lines:
route: <brainstorm|outline|draft|rewrite>
reason: <short reason>`;

function toHeuristicRoute(prompt: string): WriterRoute {
	const normalized = prompt.toLowerCase();

	if (
		/\b(rewrite|revise|edit|polish|improve|fix|shorten|expand|continue|tone|proofread|cleanup)\b/.test(
			normalized
		)
	) {
		return 'rewrite';
	}

	if (/\b(outline|structure|plan|sections?|beats?|table of contents)\b/.test(normalized)) {
		return 'outline';
	}

	if (/\b(brainstorm|ideas?|topics?|angles?|hooks?|titles?|examples)\b/.test(normalized)) {
		return 'brainstorm';
	}

	return 'draft';
}

function parseRouteDecision(raw: string, prompt: string): WriterRouteDecision {
	const normalized = raw.toLowerCase();
	const match = normalized.match(/\b(brainstorm|outline|draft|rewrite)\b/);
	const route = (match?.[1] as WriterRoute | undefined) ?? toHeuristicRoute(prompt);
	const reasonMatch = raw.match(/reason:\s*(.+)/i);

	return {
		route,
		reason: reasonMatch?.[1]?.trim() || `Fallback route selected: ${route}`,
	};
}

export async function runWriterRouterNode(input: WriterNodeContext): Promise<WriterRouteDecision> {
	const rawDecision = await completeWriterNode({
		...input,
		systemPrompt: ROUTER_SYSTEM_PROMPT,
		temperature: 0.1,
		maxTokens: 128,
	});

	return parseRouteDecision(rawDecision, input.prompt);
}
