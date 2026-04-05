import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import { assistantNodeDefinitions, ASSISTANT_NODE, type AssistantNodeName } from './nodes';
import type { RagRetriever } from './nodes/retrieve-documents';
import type { AssistantSpecialistAgent } from './specialist-agent';
import { AssistantState, type AssistantGraphState } from './state';

const LOG_SOURCE = 'AssistantGraph';

export const ASSISTANT_SPECIALIST = ASSISTANT_NODE;

export interface AssistantSpecialistModels {
	[ASSISTANT_NODE.ROUTE_QUESTION]: BaseChatModel;
	[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER]: BaseChatModel;
	[ASSISTANT_NODE.RETRIEVE_DOCUMENTS]: BaseChatModel;
	[ASSISTANT_NODE.GRADE_DOCUMENTS]: BaseChatModel;
	[ASSISTANT_NODE.REWRITE_QUERY]: BaseChatModel;
	[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE]: BaseChatModel;
	[ASSISTANT_NODE.GENERATE_ANSWER]: BaseChatModel;
}

type AssistantSpecialistResult = Partial<AssistantGraphState>;
type AssistantSpecialistRunner = (state: AssistantGraphState) => Promise<AssistantSpecialistResult>;

function routeAfterQuestion(
	state: AssistantGraphState
): typeof ASSISTANT_NODE.GENERATE_DIRECT_ANSWER | typeof ASSISTANT_NODE.RETRIEVE_DOCUMENTS {
	if (state.routeDecision === 'direct') {
		return ASSISTANT_NODE.GENERATE_DIRECT_ANSWER;
	}

	return ASSISTANT_NODE.RETRIEVE_DOCUMENTS;
}

function routeAfterGrade(
	state: AssistantGraphState
): typeof ASSISTANT_NODE.GENERATE_ANSWER | typeof ASSISTANT_NODE.REWRITE_QUERY {
	if (state.documentsRelevant) {
		return ASSISTANT_NODE.GENERATE_ANSWER;
	}

	return ASSISTANT_NODE.REWRITE_QUERY;
}

function routeAfterRewrite(
	state: AssistantGraphState
): typeof ASSISTANT_NODE.RETRIEVE_DOCUMENTS | typeof ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE {
	if (state.retryCount < state.maxRetries) {
		return ASSISTANT_NODE.RETRIEVE_DOCUMENTS;
	}

	return ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE;
}

function withNodeLogging(
	nodeName: AssistantNodeName,
	logger: LoggerService | undefined,
	runNode: AssistantSpecialistRunner
): AssistantSpecialistRunner {
	return async (state) => {
		const startedAt = Date.now();

		logger?.debug(LOG_SOURCE, `Entering node ${nodeName}`, {
			phaseLabel: state.phaseLabel,
			promptLength: state.prompt.length,
		});

		try {
			const result = await runNode(state);

			logger?.info(LOG_SOURCE, `Completed node ${nodeName}`, {
				durationMs: Date.now() - startedAt,
				updatedKeys: Object.keys(result),
				nextPhaseLabel:
					typeof result.phaseLabel === 'string' ? result.phaseLabel : state.phaseLabel,
			});

			return result;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger?.error(LOG_SOURCE, `Node ${nodeName} failed: ${message}`, {
				durationMs: Date.now() - startedAt,
			});
			throw error;
		}
	};
}

export function buildGraph(
	models: BaseChatModel | NodeModelMap,
	retriever?: RagRetriever,
	logger?: LoggerService
) {
	const m = models as unknown as AssistantSpecialistModels;
	const nodeContext = { logger, retriever };
	const nodes: Record<AssistantNodeName, AssistantSpecialistAgent> = {
		[ASSISTANT_NODE.ROUTE_QUESTION]:
			assistantNodeDefinitions[ASSISTANT_NODE.ROUTE_QUESTION].create(
				m[ASSISTANT_NODE.ROUTE_QUESTION]
			),
		[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER]:
			assistantNodeDefinitions[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER].create(
				m[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER]
			),
		[ASSISTANT_NODE.RETRIEVE_DOCUMENTS]:
			assistantNodeDefinitions[ASSISTANT_NODE.RETRIEVE_DOCUMENTS].create(
				m[ASSISTANT_NODE.RETRIEVE_DOCUMENTS]
			),
		[ASSISTANT_NODE.GRADE_DOCUMENTS]:
			assistantNodeDefinitions[ASSISTANT_NODE.GRADE_DOCUMENTS].create(
				m[ASSISTANT_NODE.GRADE_DOCUMENTS]
			),
		[ASSISTANT_NODE.REWRITE_QUERY]:
			assistantNodeDefinitions[ASSISTANT_NODE.REWRITE_QUERY].create(
				m[ASSISTANT_NODE.REWRITE_QUERY]
			),
		[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE]:
			assistantNodeDefinitions[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE].create(
				m[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE]
			),
		[ASSISTANT_NODE.GENERATE_ANSWER]:
			assistantNodeDefinitions[ASSISTANT_NODE.GENERATE_ANSWER].create(
				m[ASSISTANT_NODE.GENERATE_ANSWER]
			),
	};

	logger?.info(LOG_SOURCE, 'Building assistant graph', {
		hasRetriever: retriever !== undefined,
		nodeCount: Object.keys(ASSISTANT_NODE).length,
	});

	return new StateGraph(AssistantState)
		.addNode(
			ASSISTANT_NODE.ROUTE_QUESTION,
			withNodeLogging(ASSISTANT_NODE.ROUTE_QUESTION, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.ROUTE_QUESTION].run(
					state,
					nodes[ASSISTANT_NODE.ROUTE_QUESTION],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.GENERATE_DIRECT_ANSWER,
			withNodeLogging(ASSISTANT_NODE.GENERATE_DIRECT_ANSWER, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER].run(
					state,
					nodes[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.RETRIEVE_DOCUMENTS,
			withNodeLogging(ASSISTANT_NODE.RETRIEVE_DOCUMENTS, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.RETRIEVE_DOCUMENTS].run(
					state,
					nodes[ASSISTANT_NODE.RETRIEVE_DOCUMENTS],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.GRADE_DOCUMENTS,
			withNodeLogging(ASSISTANT_NODE.GRADE_DOCUMENTS, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.GRADE_DOCUMENTS].run(
					state,
					nodes[ASSISTANT_NODE.GRADE_DOCUMENTS],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.REWRITE_QUERY,
			withNodeLogging(ASSISTANT_NODE.REWRITE_QUERY, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.REWRITE_QUERY].run(
					state,
					nodes[ASSISTANT_NODE.REWRITE_QUERY],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE,
			withNodeLogging(ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE].run(
					state,
					nodes[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.GENERATE_ANSWER,
			withNodeLogging(ASSISTANT_NODE.GENERATE_ANSWER, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.GENERATE_ANSWER].run(
					state,
					nodes[ASSISTANT_NODE.GENERATE_ANSWER],
					nodeContext
				)
			)
		)
		.addEdge(START, ASSISTANT_NODE.ROUTE_QUESTION)
		.addConditionalEdges(ASSISTANT_NODE.ROUTE_QUESTION, routeAfterQuestion, [
			ASSISTANT_NODE.GENERATE_DIRECT_ANSWER,
			ASSISTANT_NODE.RETRIEVE_DOCUMENTS,
		])
		.addEdge(ASSISTANT_NODE.RETRIEVE_DOCUMENTS, ASSISTANT_NODE.GRADE_DOCUMENTS)
		.addConditionalEdges(ASSISTANT_NODE.GRADE_DOCUMENTS, routeAfterGrade, [
			ASSISTANT_NODE.GENERATE_ANSWER,
			ASSISTANT_NODE.REWRITE_QUERY,
		])
		.addConditionalEdges(ASSISTANT_NODE.REWRITE_QUERY, routeAfterRewrite, [
			ASSISTANT_NODE.RETRIEVE_DOCUMENTS,
			ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE,
		])
		.addEdge(ASSISTANT_NODE.GENERATE_DIRECT_ANSWER, END)
		.addEdge(ASSISTANT_NODE.GENERATE_ANSWER, END)
		.addEdge(ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE, END)
		.compile();
}
