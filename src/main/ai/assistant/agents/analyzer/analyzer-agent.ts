import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import { parseYesNo, readLabeledValue } from '../../agent-output';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './ANALYZER_SYSTEM.md?raw';

const DEFAULT_REASONING = 'The specialist outputs are coherent enough to continue to final polishing.';
const DEFAULT_RETRY_GUIDANCE = 'None.';

function buildHumanMessage(state: typeof AssistantState.State): string {
	return [
		'Original user request:',
		state.prompt,
		'',
		'Normalized request:',
		state.normalizedPrompt,
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
		'RAG output:',
		'<rag_findings>',
		state.ragFindings || 'No workspace findings were generated.',
		'</rag_findings>',
		'',
		'DuckDuckGo search output:',
		'<web_findings>',
		state.webFindings || 'No web findings were generated.',
		'</web_findings>',
	].join('\n');
}

export async function analyzerAgent(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	logger?.debug('AnalyzerAgent', 'Starting analyzer stage', {
		reviewCount: state.reviewCount,
		textFindingsLength: state.textFindings.length,
		ragFindingsLength: state.ragFindings.length,
		webFindingsLength: state.webFindings.length,
	});

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const response = await model.invoke(messages);
	const rawAnalysis = extractTokenFromChunk(response.content).trim();
	const isConsistent = parseYesNo(readLabeledValue(rawAnalysis, 'Consistency with prompt'), true);
	const reasoning = readLabeledValue(rawAnalysis, 'Reasoning') || DEFAULT_REASONING;
	const retryGuidance =
		readLabeledValue(rawAnalysis, 'Retry guidance') || DEFAULT_RETRY_GUIDANCE;
	const analysisFindings = [
		`Consistency with prompt: ${isConsistent ? 'yes' : 'no'}`,
		`Reasoning: ${reasoning}`,
		`Retry guidance: ${retryGuidance}`,
	].join('\n');
	const shouldRetry = !isConsistent;

	logger?.info('AnalyzerAgent', 'Analyzer completed', {
		shouldRetry,
		reviewCount: state.reviewCount + 1,
	});

	return {
		analysisFindings,
		shouldRetry,
		reviewCount: state.reviewCount + 1,
		phaseLabel: shouldRetry
			? ASSISTANT_STATE_MESSAGES.PLANNER
			: ASSISTANT_STATE_MESSAGES.ENHANCER,
	};
}
