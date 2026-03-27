/**
 * Compose node for the Researcher agent.
 *
 * Writes a detailed, well-structured final response using all upstream
 * context: the original prompt, classified intent, research plan, and
 * synthesised knowledge. This is the only streamed node in the pipeline —
 * tokens are collected here and returned as the final `response` field.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../shared/ai-utils';
import type { ResearcherState } from '../researcher-state';

const SYSTEM_PROMPT =
	'You are an expert writer and researcher. Using the provided research synthesis, ' +
	'write a detailed, well-structured, and insightful response to the user query. ' +
	'Organise the content clearly with logical flow. Be comprehensive yet concise — ' +
	'address the user intent fully while remaining accessible. ' +
	'Format the response in clear prose with headings or lists where appropriate.';

function buildHumanMessage(
	prompt: string,
	intent: string,
	plan: string[],
	research: string
): string {
	const planList = plan.map((step, i) => `${i + 1}. ${step}`).join('\n');
	return (
		`User query: ${prompt}\n\n` +
		`Classified intent: ${intent}\n\n` +
		`Research angles:\n${planList}\n\n` +
		`Research synthesis:\n${research}`
	);
}

export async function composeNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(buildHumanMessage(state.prompt, state.intent, state.plan, state.research)),
	];

	let response = '';
	const stream = await model.stream(messages);

	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			response += token;
		}
	}

	return { response };
}
