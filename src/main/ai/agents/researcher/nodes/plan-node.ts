/**
 * Plan node for the Researcher agent.
 *
 * Generates 3-5 focused research angles / sub-questions as a JSON array of
 * strings. The intent produced by the understand node is included in context
 * so the plan is well-scoped. Falls back to the raw prompt as a single-item
 * plan when JSON parsing fails.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ResearcherState } from '../state';

const SYSTEM_PROMPT =
	'You are a research strategist. Given a user query and its classified intent, ' +
	'create 3-5 focused research angles or sub-questions that together cover the topic comprehensively. ' +
	'Return ONLY a valid JSON array of strings — no markdown fences, no explanation, no trailing text. ' +
	'Example: ["What is X?", "How does Y affect X?", "What are the main challenges of X?"]';

function buildHumanMessage(prompt: string, intent: string): string {
	return `User query: ${prompt}\n\nClassified intent: ${intent}`;
}

function parsePlanFromResponse(content: string, fallback: string): string[] {
	try {
		const trimmed = content.trim();
		const parsed: unknown = JSON.parse(trimmed);

		if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
			return parsed as string[];
		}
	} catch {
		// Fall through to fallback
	}

	return [fallback];
}

export async function planNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(buildHumanMessage(state.prompt, state.intent)),
	];

	const response = await model.invoke(messages);
	const content = typeof response.content === 'string' ? response.content : '';
	const plan = parsePlanFromResponse(content, state.prompt);

	return { plan };
}
