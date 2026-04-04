import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../shared/ai-utils';

/**
 * A tool-less specialist agent that wraps a chat model with a fixed system
 * prompt. All specialists in the assistant graph are stateless LLM nodes —
 * no tool loop is needed, so we invoke the model directly rather than wrapping
 * it in a ReAct agent.
 */
export interface AssistantSpecialistAgent {
	readonly model: BaseChatModel;
	readonly systemPrompt: string;
}

export function createAssistantSpecialistAgent(
	model: BaseChatModel,
	systemPrompt: string
): AssistantSpecialistAgent {
	return { model, systemPrompt };
}

function buildMessages(agent: AssistantSpecialistAgent, messages: BaseMessage[]): BaseMessage[] {
	return [new SystemMessage(agent.systemPrompt), ...messages];
}

/**
 * Invoke the specialist and return the full response text.
 * Uses `model.invoke()` for a single-shot LLM call with no streaming.
 */
export async function invokeAssistantSpecialist(
	agent: AssistantSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const result = await agent.model.invoke(buildMessages(agent, messages));
	return extractTokenFromChunk(result.content).trim();
}

/**
 * Invoke the specialist with streaming and return the accumulated response.
 * Uses `model.stream()` to consume incremental `AIMessageChunk` tokens and
 * concatenate them into the final string.
 */
export async function streamAssistantSpecialist(
	agent: AssistantSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const stream = agent.model.stream(buildMessages(agent, messages));
	let accumulated = '';

	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			accumulated += token;
		}
	}

	return accumulated.trim();
}
