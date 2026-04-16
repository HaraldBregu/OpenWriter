import type { ChatModel, ChatMessage } from '../../shared/ai-types';
import { extractTokenFromChunk } from '../../shared/ai-utils';

export interface PainterSpecialistAgent {
	readonly model: ChatModel;
	readonly systemPrompt: string;
}

export function createPainterSpecialistAgent(
	model: ChatModel,
	systemPrompt: string
): PainterSpecialistAgent {
	return { model, systemPrompt };
}

function buildMessages(agent: PainterSpecialistAgent, messages: ChatMessage[]): ChatMessage[] {
	return [{ role: 'system', content: agent.systemPrompt }, ...messages];
}

export async function invokePainterSpecialist(
	agent: PainterSpecialistAgent,
	messages: ChatMessage[]
): Promise<string> {
	const result = await agent.model.invoke(buildMessages(agent, messages));
	return result.trim();
}
