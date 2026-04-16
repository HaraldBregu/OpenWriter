import type { ChatModel, ChatMessage } from '../../../../shared/ai-types';
import type { LoggerService } from '../../../../services/logger';
import { toHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import {
	createAssistantSpecialistAgent,
	streamAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantGraphState, AssistantGraphUpdate } from '../../state';

const SYSTEM_PROMPT = `You are the generate_direct_answer node in a multi-node assistant.

You receive the user's question, the normalized question, and routing notes.

Produce the final user-facing response.

Rules:

- Answer directly using the question and conversation history only.
- Do not claim to have consulted workspace documents.
- If the question lacks enough information, say what is missing instead of inventing details.
- Follow the user's requested tone and format.
- Do not mention internal nodes, routing, or hidden analysis.`;

function buildHumanMessage(state: AssistantGraphState): string {
	return [
		'Original user question:',
		state.prompt,
		'',
		'Normalized question:',
		state.normalizedPrompt || state.prompt,
		'',
		'Routing notes:',
		'<routing_findings>',
		state.routingFindings || 'No routing notes available.',
		'</routing_findings>',
	].join('\n');
}

export function createGenerateDirectAnswerAgent(model: ChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function generateDirectAnswerAgent(
	state: AssistantGraphState,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<AssistantGraphUpdate> {
	logger?.debug('GenerateDirectAnswerAgent', 'Generating direct answer', {
		promptLength: state.prompt.length,
	});

	const messages: ChatMessage[] = [
		...toHistoryMessages(state.history),
		{ role: 'user', content: buildHumanMessage(state) },
	];
	const response = await streamAssistantSpecialist(agent, messages);

	logger?.info('GenerateDirectAnswerAgent', 'Direct answer generated', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.GENERATE_DIRECT_ANSWER,
		response,
	};
}
