/**
 * Compose node for the Researcher agent.
 *
 * Writes the final user-facing response using all upstream context. When the
 * evaluate node marks the query as direct or conversational, this node must
 * answer naturally without forcing a research-heavy structure. This is the
 * only streamed node in the pipeline — tokens are collected here and returned
 * as the final `response` field.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import type { ResearcherState } from '../state';
import { RESEARCHER_STATE_MESSAGES } from '../messages';

const SYSTEM_PROMPT =
	'You are the final response writer for a researcher assistant. Use the provided ' +
	'context to answer the user in the most appropriate way for their actual intent.\n\n' +
	'Rules:\n' +
	'- If explicit research is not required, answer directly and naturally. Do not force a long, ' +
	'structured, or research-style response.\n' +
	'- Match the target response length: short should usually be 1-3 sentences; medium should be ' +
	'clear and direct; long can be structured and detailed.\n' +
	'- For greetings, pleasantries, or other casual conversation, reply like a helpful assistant, ' +
	'briefly and warmly.\n' +
	'- Only use headings or bullets when they materially help or the user asked for them.\n' +
	'- Never mention the internal plan, strategy, or whether research was skipped.';

function buildHumanMessage(
	prompt: string,
	intent: string,
	strategy: string,
	requiresResearch: boolean,
	responseLength: string,
	plan: string[],
	research: string
): string {
	const planList =
		plan.length > 0
			? plan.map((step, i) => `${i + 1}. ${step}`).join('\n')
			: 'None. A separate research plan was not needed.';
	const researchSummary =
		research.trim().length > 0
			? research
			: 'No separate research synthesis was produced. Answer directly from the user query, intent, and strategy.';

	return (
		`User query: ${prompt}\n\n` +
		`Classified intent: ${intent}\n\n` +
		`Requires explicit research: ${requiresResearch ? 'yes' : 'no'}\n\n` +
		`Target response length: ${responseLength}\n\n` +
		`Response strategy: ${strategy}\n\n` +
		`Research angles:\n${planList}\n\n` +
		`Research synthesis:\n${researchSummary}`
	);
}

export async function composeNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(
			buildHumanMessage(
				state.prompt,
				state.intent,
				state.strategy,
				state.requiresResearch,
				state.responseLength,
				state.plan,
				state.research
			)
		),
	];

	let response = '';
	const stream = await model.stream(messages);

	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			response += token;
		}
	}

	return {
		response,
		phaseLabel: RESEARCHER_STATE_MESSAGES.COMPLETE,
	};
}
