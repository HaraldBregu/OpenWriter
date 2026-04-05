import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../shared/ai-utils';

export interface WriterSpecialistAgent {
	readonly model: BaseChatModel;
	readonly systemPrompt: string;
}

export function createWriterSpecialistAgent(
	model: BaseChatModel,
	systemPrompt: string
): WriterSpecialistAgent {
	return { model, systemPrompt };
}

function buildMessages(agent: WriterSpecialistAgent, messages: BaseMessage[]): BaseMessage[] {
	return [new SystemMessage(agent.systemPrompt), ...messages];
}

export async function invokeWriterSpecialist(
	agent: WriterSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const result = await agent.model.invoke(buildMessages(agent, messages));
	return extractTokenFromChunk(result.content).trim();
}

export async function streamWriterSpecialist(
	agent: WriterSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const stream = await agent.model.stream(buildMessages(agent, messages));
	let accumulated = '';

	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			accumulated += token;
		}
	}

	return accumulated.trim();
}
