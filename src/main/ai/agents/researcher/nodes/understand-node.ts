/**
 * Understand node for the Researcher agent.
 *
 * Classifies the user's query intent in 1-2 sentences. This is a
 * non-streamed invoke call — it produces a short classification string
 * that the downstream plan node uses to focus the research angles.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ResearcherState } from '../state';
import { RESEARCHER_STATE_MESSAGES } from '../messages';

const SYSTEM_PROMPT =
	'You are a research analyst. Classify the user query intent in 1-2 concise sentences. ' +
	'Describe what the user wants to know or research — be specific about the domain, ' +
	'scope, and depth of information they are seeking. Output only the intent classification, ' +
	'no additional commentary.';

export async function understandNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(state.prompt)];

	const response = await model.invoke(messages);
	const intent = typeof response.content === 'string' ? response.content.trim() : '';

	return {
		intent,
		stateMessage: RESEARCHER_STATE_MESSAGES.EVALUATE,
	};
}
