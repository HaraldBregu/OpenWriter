import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import { parseYesNo, readLabeledValue } from '../../agent-output';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantState } from '../../state';

const SYSTEM_PROMPT = `You are the analyzer in a multi-agent assistant.

You receive the user's request, the planner brief, and the outputs from the
text, RAG, and DuckDuckGo search specialists.

Decide whether the text branch is coherent and sufficiently aligned with the
prompt, or whether it should run another pass with a refined plan.

Return exactly three lines in this format:

Consistency with prompt: yes|no
Reasoning: ...
Retry guidance: ...

Rules:

- Answer \`no\` only when another planning/research pass would materially improve
  the response.
- If one specialist is weak but the answer is still good enough, answer \`yes\`.
- Keep the reasoning specific so the planner can act on it when needed.`;

const DEFAULT_REASONING =
	'The specialist outputs are coherent enough to continue to final polishing.';
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

export function createAnalyzerAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function analyzerAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	logger?.debug('AnalyzerAgent', 'Starting analyzer stage', {
		reviewCount: state.reviewCount,
		textFindingsLength: state.textFindings.length,
		ragFindingsLength: state.ragFindings.length,
		webFindingsLength: state.webFindings.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const rawAnalysis = await invokeAssistantSpecialist(agent, messages);
	const isConsistent = parseYesNo(readLabeledValue(rawAnalysis, 'Consistency with prompt'), true);
	const reasoning = readLabeledValue(rawAnalysis, 'Reasoning') || DEFAULT_REASONING;
	const retryGuidance = readLabeledValue(rawAnalysis, 'Retry guidance') || DEFAULT_RETRY_GUIDANCE;
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
		phaseLabel: shouldRetry ? ASSISTANT_STATE_MESSAGES.PLANNER : ASSISTANT_STATE_MESSAGES.ENHANCER,
	};
}
