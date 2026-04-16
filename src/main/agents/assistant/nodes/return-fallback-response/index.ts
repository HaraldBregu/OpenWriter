import type { ChatModel, ChatMessage } from '../../../../shared/ai-types';
import type { LoggerService } from '../../../../services/logger';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import {
	createAssistantSpecialistAgent,
	streamAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantGraphState, AssistantGraphUpdate } from '../../state';

const SYSTEM_PROMPT = `You are the return_fallback_response node in a retrieval-assisted assistant.

The assistant could not find relevant workspace context after the allowed
retrieval attempts.

Produce the final user-facing response.

Rules:

- Say that relevant workspace context could not be found.
- Do not invent an answer to the question.
- Ask the user for a file path, symbol name, exact error text, or excerpt to narrow the search.
- Keep the response concise and practical.
- Do not mention internal nodes, routing, grading, or retries.`;

function buildHumanMessage(state: AssistantGraphState): string {
	return [
		'Original user question:',
		state.prompt,
		'',
		'Normalized question:',
		state.normalizedPrompt || state.prompt,
		'',
		'Last retrieval query:',
		state.retrievalQuery || 'None',
		'',
		'Last grading feedback:',
		state.gradeFindings || 'No grading feedback was provided.',
		'',
		'Last retrieved workspace context:',
		'<retrieved_context>',
		state.retrievedContext || 'No retrieved context was produced.',
		'</retrieved_context>',
	].join('\n');
}

export function createReturnFallbackResponseAgent(model: ChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function returnFallbackResponseAgent(
	state: AssistantGraphState,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<AssistantGraphUpdate> {
	logger?.debug('ReturnFallbackResponseAgent', 'Generating fallback response', {
		retryCount: state.retryCount,
		maxRetries: state.maxRetries,
	});

	const messages: ChatMessage[] = [{ role: 'user', content: buildHumanMessage(state) }];
	const response = await streamAssistantSpecialist(agent, messages);

	logger?.info('ReturnFallbackResponseAgent', 'Fallback response generated', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.RETURN_FALLBACK_RESPONSE,
		response,
	};
}
