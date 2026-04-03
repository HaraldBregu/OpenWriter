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
import SYSTEM_PROMPT from './ENHANCER_SYSTEM.md?raw';

function buildHumanMessage(state: typeof AssistantState.State): string {
	return [
		'Original user request:',
		state.prompt,
		'',
		'Intent findings:',
		'<intent_findings>',
		state.intentFindings || 'No intent findings available.',
		'</intent_findings>',
		'',
		'Planner brief:',
		'<planner_findings>',
		state.plannerFindings || 'No planner brief available.',
		'</planner_findings>',
		'',
		'Text generator output:',
		'<text_findings>',
		state.textFindings || 'No text draft was generated.',
		'</text_findings>',
		'',
		'Workspace retrieval output:',
		'<rag_findings>',
		state.ragFindings || 'No relevant workspace context was found for this request.',
		'</rag_findings>',
		'',
		'DuckDuckGo search output:',
		'<web_findings>',
		state.webFindings || 'No external findings were generated.',
		'</web_findings>',
		'',
		'Analyzer verdict:',
		'<analysis_findings>',
		state.analysisFindings || 'No analyzer verdict available.',
		'</analysis_findings>',
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
	logger?.debug('EnhancerAgent', 'Starting enhancer generation', {
		promptLength: state.prompt.length,
		plannerFindingsLength: state.plannerFindings.length,
		textFindingsLength: state.textFindings.length,
		ragFindingsLength: state.ragFindings.length,
		webFindingsLength: state.webFindings.length,
		analysisFindingsLength: state.analysisFindings.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const response = await streamAssistantSpecialist(agent, messages);

	logger?.info('EnhancerAgent', 'Enhancer response generated', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.ENHANCER,
		response,
	};
}
