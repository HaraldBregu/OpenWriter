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

const SYSTEM_PROMPT = `You are the Response Preparer in a multi-node assistant.

You receive:

- the user's original request
- prior conversation history
- the intent analysis
- optional workspace retrieval findings
- optional online research findings

Produce the final user-facing response.

Rules:

- If the request was a direct question and research agents were skipped, answer directly.
- If the request was generation or research, merge the RAG and web findings only when they help.
- If retrieval or online research were weak, unavailable, or skipped, say so plainly rather than inventing facts.
- If the user asked for an image or other visual asset, state clearly that this assistant replies in text and provide the best useful text substitute.
- Follow the user's requested tone, format, and level of detail.
- Do not mention internal nodes, routing, or hidden analysis.`;

function buildHumanMessage(state: typeof AssistantState.State): string {
	return [
		'Original user request:',
		state.prompt,
		'',
		'Normalized request:',
		state.normalizedPrompt || state.prompt,
		'',
		'Intent analysis:',
		'<intent_findings>',
		state.intentFindings || 'No intent findings available.',
		'</intent_findings>',
		'',
		'Workspace retrieval findings:',
		'<rag_findings>',
		state.ragFindings || 'No workspace findings were generated.',
		'</rag_findings>',
		'',
		'Online research findings:',
		'<web_findings>',
		state.webFindings || 'No online research findings were generated.',
		'</web_findings>',
	].join('\n');
}

export function createEnhancerAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function enhancerAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	logger?.debug('ResponsePreparerAgent', 'Starting final response generation', {
		promptLength: state.prompt.length,
		intentCategory: state.intentCategory,
		needsParallelResearch: state.needsParallelResearch,
		ragFindingsLength: state.ragFindings.length,
		webFindingsLength: state.webFindings.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const response = await streamAssistantSpecialist(agent, messages);

	logger?.info('ResponsePreparerAgent', 'Final response generated', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.RESPONSE_PREPARER,
		response,
	};
}
