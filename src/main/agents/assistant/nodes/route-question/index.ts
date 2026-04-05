import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import { readLabeledValue } from '../../agent-output';
import type { AssistantRouteDecision, AssistantState } from '../../state';

const SYSTEM_PROMPT = `You are the route_question node in a retrieval-assisted assistant.

You receive the user's latest question and conversation history.

Choose one route:

- direct: the question can be answered from the prompt and history alone
- rag: the question depends on workspace files, code, architecture, configuration, or other indexed project context

Return exactly four lines in this format:

Normalized question: ...
Route: direct|rag
Retrieval query: ...
Reasoning: ...

Rules:

- Use \`rag\` when the user asks about the current workspace, repository, files, symbols, implementation details, or project behavior.
- Use \`direct\` for generic explanations, writing help, brainstorming, or questions answerable without workspace retrieval.
- If the route is \`direct\`, return \`Skip\` for \`Retrieval query\`.
- Preserve exact file paths, symbol names, and product terms in the retrieval query.
- Keep the retrieval query short and specific.`;

interface RouteQuestionResult {
	readonly normalizedPrompt: string;
	readonly routeDecision: AssistantRouteDecision;
	readonly retrievalQuery: string;
	readonly routingFindings: string;
}

const SKIP_QUERY = 'Skip';
const WORKSPACE_PATTERN =
	/\b(repo|repository|codebase|workspace|project|file|folder|module|class|function|component|config|implementation|error|stack trace|source)\b/i;
const PATH_PATTERN =
	/(?:^|\s)(?:\.{0,2}\/|\/)?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+(?:\.[A-Za-z0-9]+)?/;
const SYMBOL_PATTERN = /\b[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+\b|\b[a-z_][A-Za-z0-9_]*\(/;

function normalizeQuery(value: string | undefined): string {
	if (!value || /^skip\b/i.test(value)) {
		return '';
	}

	return value.trim();
}

function buildRoutingFindings(
	normalizedPrompt: string,
	routeDecision: AssistantRouteDecision,
	retrievalQuery: string,
	reasoning: string
): string {
	return [
		`Normalized question: ${normalizedPrompt}`,
		`Route: ${routeDecision}`,
		`Retrieval query: ${retrievalQuery || SKIP_QUERY}`,
		`Routing notes: ${reasoning}`,
	].join('\n');
}

function inferRouteDecision(prompt: string): AssistantRouteDecision {
	if (WORKSPACE_PATTERN.test(prompt) || PATH_PATTERN.test(prompt) || SYMBOL_PATTERN.test(prompt)) {
		return 'rag';
	}

	return 'direct';
}

function buildFallback(prompt: string): RouteQuestionResult {
	const normalizedPrompt = prompt.trim() || 'No question provided.';
	const routeDecision = inferRouteDecision(normalizedPrompt);
	const retrievalQuery = routeDecision === 'rag' ? normalizedPrompt : '';

	return {
		normalizedPrompt,
		routeDecision,
		retrievalQuery,
		routingFindings: buildRoutingFindings(
			normalizedPrompt,
			routeDecision,
			retrievalQuery,
			'Used fallback routing heuristics because structured output was unavailable.'
		),
	};
}

function parseRouteDecision(
	value: string | undefined,
	fallback: AssistantRouteDecision
): AssistantRouteDecision {
	if (!value) {
		return fallback;
	}

	const normalized = value.trim().toLowerCase();
	return normalized === 'rag' || normalized === 'direct' ? normalized : fallback;
}

function parseRoutingOutput(raw: string, prompt: string): RouteQuestionResult {
	const fallback = buildFallback(prompt);
	const normalizedPrompt =
		readLabeledValue(raw, 'Normalized question') || fallback.normalizedPrompt;
	const routeDecision = parseRouteDecision(readLabeledValue(raw, 'Route'), fallback.routeDecision);
	const retrievalQuery =
		routeDecision === 'rag'
			? normalizeQuery(
					readLabeledValue(raw, 'Retrieval query') || fallback.retrievalQuery || normalizedPrompt
				)
			: '';
	const reasoning =
		readLabeledValue(raw, 'Reasoning') || 'Structured routing succeeded without additional notes.';

	return {
		normalizedPrompt,
		routeDecision,
		retrievalQuery,
		routingFindings: buildRoutingFindings(
			normalizedPrompt,
			routeDecision,
			retrievalQuery,
			reasoning
		),
	};
}

function buildHumanMessage(prompt: string): string {
	return ['Latest user question:', prompt].join('\n');
}

export function createRouteQuestionAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function routeQuestionAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(prompt);
		logger?.debug('RouteQuestionAgent', 'Using fallback routing for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			routeDecision: fallback.routeDecision,
			retrievalQuery: fallback.retrievalQuery,
			routingFindings: fallback.routingFindings,
			phaseLabel:
				fallback.routeDecision === 'direct'
					? ASSISTANT_STATE_MESSAGES.GENERATE_DIRECT_ANSWER
					: ASSISTANT_STATE_MESSAGES.RETRIEVE_DOCUMENTS,
		};
	}

	logger?.debug('RouteQuestionAgent', 'Starting question routing', {
		promptLength: prompt.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const rawRouting = await invokeAssistantSpecialist(agent, messages);
	const parsed = parseRoutingOutput(rawRouting, prompt);

	logger?.info('RouteQuestionAgent', 'Question routing completed', {
		routeDecision: parsed.routeDecision,
		retrievalQueryLength: parsed.retrievalQuery.length,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		routeDecision: parsed.routeDecision,
		retrievalQuery: parsed.retrievalQuery,
		routingFindings: parsed.routingFindings,
		phaseLabel:
			parsed.routeDecision === 'direct'
				? ASSISTANT_STATE_MESSAGES.GENERATE_DIRECT_ANSWER
				: ASSISTANT_STATE_MESSAGES.RETRIEVE_DOCUMENTS,
	};
}
