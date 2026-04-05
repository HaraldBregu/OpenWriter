import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../shared/ai-utils';

export interface PainterSpecialistAgent {
	readonly model: BaseChatModel;
	readonly systemPrompt: string;
}

export function createPainterSpecialistAgent(
	model: BaseChatModel,
	systemPrompt: string
): PainterSpecialistAgent {
	return { model, systemPrompt };
}

function buildMessages(agent: PainterSpecialistAgent, messages: BaseMessage[]): BaseMessage[] {
	return [new SystemMessage(agent.systemPrompt), ...messages];
}

export async function invokePainterSpecialist(
	agent: PainterSpecialistAgent,
	messages: BaseMessage[]
): Promise<string> {
	const result = await agent.model.invoke(buildMessages(agent, messages));
	return extractTokenFromChunk(result.content).trim();
}
