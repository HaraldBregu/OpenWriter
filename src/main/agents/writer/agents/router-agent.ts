import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { parseYesNo, readLabeledValue } from '../agent-output';
import { WRITER_STATE_MESSAGES } from '../messages';
import {
	createWriterSpecialistAgent,
	invokeWriterSpecialist,
	type WriterSpecialistAgent,
} from '../specialist-agent';
import { WriterState } from '../state';

const SYSTEM_PROMPT = `You are the router in a writer multi-agent workflow.

You receive the user's latest request and conversation history.

Decide whether the request can be answered directly or needs:

- workspace retrieval
- live external search

Return exactly seven lines in this format:

Normalized request: ...
Simple response: yes|no
RAG required: yes|no
Web search required: yes|no
RAG query: ...
Web search query: ...
Reasoning: ...

Rules:

- Answer Simple response with yes only when the request can be handled directly
  from the prompt and prior conversation.
- If RAG is not required, set RAG query to Skip.
- If Web search is not required, set Web search query to Skip.
- If the user asks for current, recent, latest, or real-world external facts,
  Web search should usually be yes.
- If the user asks about workspace files, project code, notes, or indexed local
  knowledge, RAG should usually be yes.`;

interface RouterResult {
	readonly normalizedPrompt: string;
	readonly routingFindings: string;
	readonly simpleResponse: boolean;
	readonly needsRetrieval: boolean;
	readonly needsWebSearch: boolean;
	readonly ragQuery: string;
	readonly webSearchQuery: string;
}

const RETRIEVAL_PATTERN =
	/\b(workspace|codebase|repo|repository|project|document|docs|notes|context|from the files|from the repo|from the project|based on the workspace)\b/i;
const WEB_SEARCH_PATTERN =
	/\b(latest|current|recent|today|news|weather|price|stock|market|up to date|up-to-date|search the web|browse the web|internet|online)\b/i;
const SKIP_QUERY = 'Skip';

function normalizeQuery(value: string | undefined): string {
	if (!value || /^skip\b/i.test(value)) {
		return '';
	}

	return value.trim();
}

function buildRoutingFindings(
	normalizedPrompt: string,
	simpleResponse: boolean,
	needsRetrieval: boolean,
	needsWebSearch: boolean,
	ragQuery: string,
	webSearchQuery: string,
	reasoning: string
): string {
	return [
		`Normalized request: ${normalizedPrompt}`,
		`Simple response: ${simpleResponse ? 'yes' : 'no'}`,
		`Workspace retrieval: ${needsRetrieval ? 'yes' : 'no'}`,
		`Web search: ${needsWebSearch ? 'yes' : 'no'}`,
		`RAG query: ${ragQuery || SKIP_QUERY}`,
		`Web search query: ${webSearchQuery || SKIP_QUERY}`,
		`Routing notes: ${reasoning}`,
	].join('\n');
}

function buildFallback(prompt: string): RouterResult {
	const normalizedPrompt = prompt.trim() || 'No request provided.';
	const needsRetrieval = RETRIEVAL_PATTERN.test(normalizedPrompt);
	const needsWebSearch = WEB_SEARCH_PATTERN.test(normalizedPrompt);
	const simpleResponse = !needsRetrieval && !needsWebSearch;
	const ragQuery = needsRetrieval ? normalizedPrompt : '';
	const webSearchQuery = needsWebSearch ? normalizedPrompt : '';

	return {
		normalizedPrompt,
		routingFindings: buildRoutingFindings(
			normalizedPrompt,
			simpleResponse,
			needsRetrieval,
			needsWebSearch,
			ragQuery,
			webSearchQuery,
			'Used fallback heuristics because structured routing output was unavailable.'
		),
		simpleResponse,
		needsRetrieval,
		needsWebSearch,
		ragQuery,
		webSearchQuery,
	};
}

function parseRouterResult(raw: string, prompt: string): RouterResult {
	const fallback = buildFallback(prompt);
	const normalizedPrompt = readLabeledValue(raw, 'Normalized request') || fallback.normalizedPrompt;
	const needsRetrieval = parseYesNo(readLabeledValue(raw, 'RAG required'), fallback.needsRetrieval);
	const needsWebSearch = parseYesNo(
		readLabeledValue(raw, 'Web search required'),
		fallback.needsWebSearch
	);
	const fallbackSimpleResponse = !needsRetrieval && !needsWebSearch;
	const simpleResponse = parseYesNo(
		readLabeledValue(raw, 'Simple response'),
		fallback.simpleResponse || fallbackSimpleResponse
	);
	const ragQuery = normalizeQuery(readLabeledValue(raw, 'RAG query') || fallback.ragQuery || SKIP_QUERY);
	const webSearchQuery = normalizeQuery(
		readLabeledValue(raw, 'Web search query') || fallback.webSearchQuery || SKIP_QUERY
	);
	const reasoning =
		readLabeledValue(raw, 'Reasoning') ||
		'Structured routing succeeded without additional fallback notes.';

	return {
		normalizedPrompt,
		routingFindings: buildRoutingFindings(
			normalizedPrompt,
			simpleResponse,
			needsRetrieval,
			needsWebSearch,
			ragQuery,
			webSearchQuery,
			reasoning
		),
		simpleResponse,
		needsRetrieval,
		needsWebSearch,
		ragQuery,
		webSearchQuery,
	};
}

function buildHumanMessage(prompt: string): string {
	return ['Latest user request:', prompt].join('\n');
}

export function createRouterAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function routerAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(prompt);
		logger?.debug('WriterRouterAgent', 'Skipping routing for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			routingFindings: fallback.routingFindings,
			simpleResponse: fallback.simpleResponse,
			needsRetrieval: fallback.needsRetrieval,
			needsWebSearch: fallback.needsWebSearch,
			ragQuery: fallback.ragQuery,
			webSearchQuery: fallback.webSearchQuery,
			phaseLabel: WRITER_STATE_MESSAGES.AGGREGATOR,
		};
	}

	logger?.debug('WriterRouterAgent', 'Starting routing', {
		promptLength: prompt.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const rawDecision = await invokeWriterSpecialist(agent, messages);
	const parsed = parseRouterResult(rawDecision, prompt);
	const shouldResearch = parsed.needsRetrieval || parsed.needsWebSearch;

	logger?.info('WriterRouterAgent', 'Routing completed', {
		simpleResponse: parsed.simpleResponse,
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		routingFindings: parsed.routingFindings,
		simpleResponse: parsed.simpleResponse,
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
		ragQuery: parsed.ragQuery,
		webSearchQuery: parsed.webSearchQuery,
		phaseLabel: shouldResearch ? WRITER_STATE_MESSAGES.RESEARCH : WRITER_STATE_MESSAGES.AGGREGATOR,
	};
}
