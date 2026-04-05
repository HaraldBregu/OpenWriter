import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { searchDuckDuckGo } from '../../assistant/agents/duckduckgo-search';
import {
	createWriterSpecialistAgent,
	invokeWriterSpecialist,
	type WriterSpecialistAgent,
} from '../specialist-agent';
import { WriterState } from '../state';

const SYSTEM_PROMPT = `You are the web search specialist in a writer multi-agent workflow.

You receive the user's request, the router notes, and external search results.

Produce an internal note for the final aggregator, not a user-facing reply.

Rules:

- Use only the provided search results.
- Highlight the findings most relevant to the request.
- Mention source domains or URLs when they materially support a claim.
- If the search results are weak, partial, or stale, say so plainly.
- Keep the note concise and directly useful for the final response.`;

const WEB_SEARCH_SKIPPED_FINDING = 'Web search was not required for this request.';
const WEB_SEARCH_EMPTY_FINDING = 'Web search did not return useful external findings for this request.';

function buildSearchContext(results: Awaited<ReturnType<typeof searchDuckDuckGo>>): string {
	return results
		.map((result, index) =>
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
	routingFindings: string,
	searchContext: string
): string {
	return [
		'User request:',
		prompt,
		'',
		'Normalized request:',
		normalizedPrompt,
		'',
		'Router notes:',
		'<routing_findings>',
		routingFindings,
		'</routing_findings>',
		'',
		'Search results:',
		'<web_search_results>',
		searchContext,
		'</web_search_results>',
	].join('\n');
}

export function createSearchAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function searchAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const query = (state.webSearchQuery || state.normalizedPrompt || state.prompt).trim();

	if (!state.needsWebSearch) {
		logger?.debug('WriterSearchAgent', 'Skipping web search because it was not requested');
		return { webFindings: WEB_SEARCH_SKIPPED_FINDING };
	}

	if (query.length === 0) {
		logger?.debug('WriterSearchAgent', 'Skipping web search because the query is empty');
		return { webFindings: WEB_SEARCH_EMPTY_FINDING };
	}

	logger?.debug('WriterSearchAgent', 'Starting web search', {
		queryLength: query.length,
	});

	const results = await searchDuckDuckGo(query, logger);
	logger?.info('WriterSearchAgent', 'Web search completed', {
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
				state.routingFindings,
				buildSearchContext(results)
			)
		),
	];
	const webFindings = await invokeWriterSpecialist(agent, messages);

	logger?.info('WriterSearchAgent', 'Web findings generated', {
		findingsLength: webFindings.length,
	});

	return {
		webFindings: webFindings || WEB_SEARCH_EMPTY_FINDING,
	};
}
