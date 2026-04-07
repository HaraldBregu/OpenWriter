import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../shared/ai-utils';

export interface ImageGeneratorSpecialistAgent {
	readonly model: BaseChatModel;
	readonly systemPrompt: string;
}

export function createImageGeneratorSpecialistAgent(
	model: BaseChatModel,
	systemPrompt: string
): ImageGeneratorSpecialistAgent {
	return { model, systemPrompt };
}

function buildMessages(
	agent: ImageGeneratorSpecialistAgent,
	messages: BaseMessage[]
): BaseMessage[] {
	return [new SystemMessage(agent.systemPrompt), ...messages];
}

export async function invokeImageGeneratorSpecialist(
	agent: ImageGeneratorSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const result = await agent.model.invoke(buildMessages(agent, messages));
	return extractTokenFromChunk(result.content).trim();
}
