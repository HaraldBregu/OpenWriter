import type { ChatModel, ChatMessage } from '../../shared/ai-types';

/**
 * A tool-less specialist agent that wraps a chat model with a fixed system
 * prompt. All specialists in the assistant graph are stateless LLM nodes —
 * no tool loop is needed, so we invoke the model directly.
 */
export interface AssistantSpecialistAgent {
	readonly model: ChatModel;
	readonly systemPrompt: string;
}

export function createAssistantSpecialistAgent(
	model: ChatModel,
	systemPrompt: string
): AssistantSpecialistAgent {
	return { model, systemPrompt };
}

function buildMessages(agent: AssistantSpecialistAgent, messages: ChatMessage[]): ChatMessage[] {
	return [{ role: 'system', content: agent.systemPrompt }, ...messages];
}

/**
 * Invoke the specialist and return the full response text.
 * Uses `model.invoke()` for a single-shot call with no streaming.
 */
export async function invokeAssistantSpecialist(
	agent: AssistantSpecialistAgent,
	messages: ChatMessage[]
): Promise<string> {
	const result = await agent.model.invoke(buildMessages(agent, messages));
	return result.trim();
}

/**
 * Invoke the specialist with streaming and return the accumulated response.
 * Uses `model.stream()` to consume incremental tokens and concatenate them.
 */
export async function streamAssistantSpecialist(
	agent: AssistantSpecialistAgent,
	messages: ChatMessage[]
): Promise<string> {
	let accumulated = '';

	for await (const token of agent.model.stream(buildMessages(agent, messages))) {
		if (token) {
			accumulated += token;
		}
	}

	return accumulated.trim();
}
