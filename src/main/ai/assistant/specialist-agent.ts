import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { extractTokenFromChunk } from '../../shared/ai-utils';

export function createAssistantSpecialistAgent(model: BaseChatModel, systemPrompt: string) {
	return createAgent({
		model,
		tools: [],
		systemPrompt,
	});
}

export type AssistantSpecialistAgent = ReturnType<typeof createAssistantSpecialistAgent>;

function getMessageText(message: { content: unknown }): string {
	return extractTokenFromChunk(message.content).trim();
}

function getLastAIMessageText(messages: BaseMessage[]): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message instanceof AIMessage) {
			return getMessageText(message);
		}
	}

	return '';
}

export async function invokeAssistantSpecialist(
	agent: AssistantSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const result = await agent.invoke({ messages });
	return getLastAIMessageText(result.messages);
}

export async function streamAssistantSpecialist(
	agent: AssistantSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	let streamedResponse = '';
	let finalResponse = '';

	const stream = await agent.stream({ messages }, { streamMode: 'messages' });

	for await (const event of stream) {
		const [chunk] = Array.isArray(event) ? event : [event];

		if (!chunk || typeof chunk !== 'object' || !('content' in chunk)) {
			continue;
		}

		const text = getMessageText(chunk as { content: unknown });
		if (!text) {
			continue;
		}

		if (chunk instanceof AIMessage) {
			finalResponse = text;
			continue;
		}

		streamedResponse += text;
	}

	return streamedResponse.trim() || finalResponse;
}
