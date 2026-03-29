/**
 * Plan node for the Researcher agent.
 *
 * Generates 3-5 focused research angles / sub-questions as a JSON array of
 * strings. The intent and strategy produced by earlier nodes are included in
 * context so the plan is well-scoped and aligned with the chosen approach.
 * Falls back to the raw prompt as a single-item plan when JSON parsing fails.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ResearcherState } from '../state';
import { RESEARCHER_STATE_MESSAGES } from '../messages';

const SYSTEM_PROMPT =
	'You are a research strategist. Given a user query, its classified intent, ' +
	'a recommended response strategy, and the target response length, ' +
	'create a focused set of research angles or sub-questions that cover the topic without over-planning. ' +
	'Use 2-3 angles for short answers, 3-4 for medium answers, and 4-5 for long answers. ' +
	'Align the angles with the response strategy — depth, format, and scope should match it. ' +
	'Return ONLY a valid JSON array of strings — no markdown fences, no explanation, no trailing text. ' +
	'Example: ["What is X?", "How does Y affect X?", "What are the main challenges of X?"]';

function buildHumanMessage(
	prompt: string,
	intent: string,
	strategy: string,
	responseLength: string
): string {
	return (
		`User query: ${prompt}\n\n` +
		`Classified intent: ${intent}\n\n` +
		`Target response length: ${responseLength}\n\n` +
		`Response strategy: ${strategy}`
	);
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
		new HumanMessage(
			buildHumanMessage(state.prompt, state.intent, state.strategy, state.responseLength)
		),
	];

	const response = await model.invoke(messages);
	const content = typeof response.content === 'string' ? response.content : '';
	const plan = parsePlanFromResponse(content, state.prompt);

	return {
		plan,
		phaseLabel: RESEARCHER_STATE_MESSAGES.RESEARCH,
	};
}
