import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import {
	createAssistantSpecialistAgent,
	streamAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantState } from '../../state';

const SYSTEM_PROMPT = `You are the generate_answer node in a retrieval-assisted assistant.

You receive the user's question, routing notes, grading feedback, and retrieved
workspace context.

Produce the final user-facing response.

Rules:

- Base the answer on the retrieved workspace context when it supports the answer.
- If the retrieved context is partial, say what is uncertain or missing.
- Do not invent facts beyond the provided context.
- Follow the user's requested tone and format.
- Do not mention internal nodes, routing, grading, or retries.`;

function buildHumanMessage(state: typeof AssistantState.State): string {
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
		'',
		'Grading feedback:',
		'<grade_findings>',
		state.gradeFindings || 'No grading feedback was provided.',
		'</grade_findings>',
		'',
		'Retrieved workspace context:',
		'<retrieved_context>',
		state.retrievedContext || 'No retrieved context was produced.',
		'</retrieved_context>',
	].join('\n');
}

export function createGenerateAnswerAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function generateAnswerAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	logger?.debug('GenerateAnswerAgent', 'Generating retrieval-assisted answer', {
		retrievedContextLength: state.retrievedContext.length,
		gradeFindingsLength: state.gradeFindings.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const response = await streamAssistantSpecialist(agent, messages);

	logger?.info('GenerateAnswerAgent', 'Retrieval-assisted answer generated', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.GENERATE_ANSWER,
		response,
	};
}
