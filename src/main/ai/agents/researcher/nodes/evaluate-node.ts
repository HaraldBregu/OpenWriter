/**
 * Evaluate node for the Researcher agent.
 *
 * Receives the classified intent from the understand node and determines the
 * optimal response strategy for the query. The strategy captures the response
 * type (e.g. factual lookup, deep research, comparative analysis,
 * step-by-step explanation, opinion synthesis), the appropriate depth level,
 * format preferences, and any special handling considerations.
 *
 * This is a non-streamed invoke call. The resulting strategy string is
 * injected into the context of all downstream nodes (plan, research, compose)
 * so they can tailor their output accordingly.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ResearcherState } from '../state';

const SYSTEM_PROMPT =
	'You are a response strategist. Given a user query and its classified intent, ' +
	'determine the optimal strategy for answering it. ' +
	'Consider the following dimensions:\n' +
	'  - Response type: factual lookup, deep research, comparative analysis, ' +
	'step-by-step explanation, opinion synthesis, or creative exploration\n' +
	'  - Depth level: surface overview, moderate detail, or comprehensive deep-dive\n' +
	'  - Format preferences: prose, structured headings, numbered steps, tables, ' +
	'bullet points, or a combination\n' +
	'  - Special considerations: domain expertise required, recency sensitivity, ' +
	'ambiguity that needs clarification, or nuance that must be preserved\n\n' +
	'Output a concise strategy description (3-5 sentences) that downstream agents ' +
	'can use to calibrate their planning, research, and writing. ' +
	'Output only the strategy, no additional commentary.';

function buildHumanMessage(prompt: string, intent: string): string {
	return `User query: ${prompt}\n\nClassified intent: ${intent}`;
}

export async function evaluateNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(buildHumanMessage(state.prompt, state.intent)),
	];

	const response = await model.invoke(messages);
	const strategy = typeof response.content === 'string' ? response.content.trim() : '';

	return { strategy };
}
