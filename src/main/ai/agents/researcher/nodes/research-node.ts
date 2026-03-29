/**
 * Research node for the Researcher agent.
 *
 * Synthesises comprehensive knowledge about the topic using the classified
 * intent, response strategy, and the planned research angles as context.
 * This is a non-streamed invoke call — the resulting knowledge block feeds
 * directly into the compose node which produces the user-visible streamed
 * response.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ResearcherState } from '../state';

const SYSTEM_PROMPT =
	'You are a knowledgeable research expert. Synthesise comprehensive, accurate knowledge ' +
	'about the topic given the user query, classified intent, response strategy, and research angles. ' +
	'Cover each research angle thoroughly. Let the response strategy guide the depth and focus ' +
	'of your synthesis. Be factual, thorough, and well-organised. ' +
	'This synthesis will be used as the knowledge foundation for a final response.';

function buildHumanMessage(
	prompt: string,
	intent: string,
	strategy: string,
	plan: string[]
): string {
	const planList = plan.map((step, i) => `${i + 1}. ${step}`).join('\n');
	return (
		`User query: ${prompt}\n\n` +
		`Classified intent: ${intent}\n\n` +
		`Response strategy: ${strategy}\n\n` +
		`Research angles:\n${planList}`
	);
}

export async function researchNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(buildHumanMessage(state.prompt, state.intent, state.strategy, state.plan)),
	];

	const response = await model.invoke(messages);
	const research = typeof response.content === 'string' ? response.content.trim() : '';

	return { research };
}
