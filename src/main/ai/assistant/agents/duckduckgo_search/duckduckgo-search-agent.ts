import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './DUCKDUCKGO_SEARCH_SYSTEM.md?raw';
import { searchDuckDuckGo } from './duckduckgo-search';

const WEB_SEARCH_SKIPPED_FINDING = 'DuckDuckGo search was not required for this request.';
const WEB_SEARCH_EMPTY_FINDING =
	'DuckDuckGo search did not return useful external findings for this request.';

function buildSearchContext(results: Awaited<ReturnType<typeof searchDuckDuckGo>>): string {
	return results
		.map(
			(result, index) =>
				[
					`Result ${index + 1}: ${result.title}`,
					`URL: ${result.url}`,
					`Source: ${result.source}`,
					`Snippet: ${result.snippet}`,
				].join('\n')
		)
		.join('\n\n---\n\n');
}

function buildHumanMessage(
	prompt: string,
	normalizedPrompt: string,
	plannerFindings: string,
	searchContext: string
): string {
	return [
		'User request:',
		prompt,
		'',
		'Normalized request:',
		normalizedPrompt,
		'',
		'Planner brief:',
		'<planner_findings>',
		plannerFindings,
		'</planner_findings>',
		'',
		'DuckDuckGo search results:',
		'<web_search_results>',
		searchContext,
		'</web_search_results>',
	].join('\n');
}

export function createDuckDuckGoSearchAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function duckDuckGoSearchAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const query = (state.webSearchQuery || state.normalizedPrompt || state.prompt).trim();

	if (!state.needsWebSearch) {
		logger?.debug('DuckDuckGoSearchAgent', 'Skipping web search because it was not requested');
		return { webFindings: WEB_SEARCH_SKIPPED_FINDING };
	}

	if (query.length === 0) {
		logger?.debug('DuckDuckGoSearchAgent', 'Skipping web search because the query is empty');
		return { webFindings: WEB_SEARCH_EMPTY_FINDING };
	}

	logger?.debug('DuckDuckGoSearchAgent', 'Starting DuckDuckGo search', {
		queryLength: query.length,
	});

	const results = await searchDuckDuckGo(query, logger);
	logger?.info('DuckDuckGoSearchAgent', 'DuckDuckGo search completed', {
		resultCount: results.length,
	});

	if (results.length === 0) {
		return { webFindings: WEB_SEARCH_EMPTY_FINDING };
	}

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(
			buildHumanMessage(
				state.prompt,
				state.normalizedPrompt || state.prompt,
				state.plannerFindings,
				buildSearchContext(results)
			)
		),
	];
	const webFindings = await invokeAssistantSpecialist(agent, messages);

	logger?.info('DuckDuckGoSearchAgent', 'DuckDuckGo findings generated', {
		findingsLength: webFindings.length,
	});

	return {
		webFindings: webFindings || WEB_SEARCH_EMPTY_FINDING,
	};
}
