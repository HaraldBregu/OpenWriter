import { END, START, StateGraph } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import type { RagRetriever } from '../assistant/nodes/retrieve-documents';
import { WriterState } from './state';
import { aggregatorAgent, createAggregatorAgent } from './agents/aggregator-agent';
import { createRagRetrievalAgent, ragRetrievalAgent } from './agents/rag-retrieval-agent';
import { createRouterAgent, routerAgent } from './agents/router-agent';
import { createSearchAgent, searchAgent } from './agents/search-agent';

const LOG_SOURCE = 'WriterGraph';

export const WRITER_SPECIALIST = {
	ROUTER: 'router',
	RAG_RETRIEVAL: 'rag_retrieval',
	SEARCH: 'search',
	AGGREGATOR: 'aggregator',
} as const;

export interface WriterSpecialistModels {
	[WRITER_SPECIALIST.ROUTER]: BaseChatModel;
	[WRITER_SPECIALIST.RAG_RETRIEVAL]: BaseChatModel;
	[WRITER_SPECIALIST.SEARCH]: BaseChatModel;
	[WRITER_SPECIALIST.AGGREGATOR]: BaseChatModel;
}

type WriterSpecialistName = (typeof WRITER_SPECIALIST)[keyof typeof WRITER_SPECIALIST];
type WriterGraphState = typeof WriterState.State;
type WriterSpecialistResult = Partial<WriterGraphState>;
type WriterSpecialistRunner = (state: WriterGraphState) => Promise<WriterSpecialistResult>;

function routeAfterRouter(
	state: WriterGraphState
):
	| typeof WRITER_SPECIALIST.AGGREGATOR
	| [typeof WRITER_SPECIALIST.RAG_RETRIEVAL, typeof WRITER_SPECIALIST.SEARCH] {
	if (state.simpleResponse || (!state.needsRetrieval && !state.needsWebSearch)) {
		return WRITER_SPECIALIST.AGGREGATOR;
	}

	return [WRITER_SPECIALIST.RAG_RETRIEVAL, WRITER_SPECIALIST.SEARCH];
}

function withSpecialistLogging(
	specialistName: WriterSpecialistName,
	logger: LoggerService | undefined,
	runSpecialist: WriterSpecialistRunner
): WriterSpecialistRunner {
	return async (state) => {
		const startedAt = Date.now();

		logger?.debug(LOG_SOURCE, `Entering specialist ${specialistName}`, {
			phaseLabel: state.phaseLabel,
			promptLength: state.prompt.length,
		});

		try {
			const result = await runSpecialist(state);

			logger?.info(LOG_SOURCE, `Completed specialist ${specialistName}`, {
				durationMs: Date.now() - startedAt,
				updatedKeys: Object.keys(result),
				nextPhaseLabel:
					typeof result.phaseLabel === 'string' ? result.phaseLabel : state.phaseLabel,
			});

			return result;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger?.error(LOG_SOURCE, `Specialist ${specialistName} failed: ${message}`, {
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
	const m = models as unknown as WriterSpecialistModels;
	const specialists = {
		[WRITER_SPECIALIST.ROUTER]: createRouterAgent(m[WRITER_SPECIALIST.ROUTER]),
		[WRITER_SPECIALIST.RAG_RETRIEVAL]: createRagRetrievalAgent(
			m[WRITER_SPECIALIST.RAG_RETRIEVAL]
		),
		[WRITER_SPECIALIST.SEARCH]: createSearchAgent(m[WRITER_SPECIALIST.SEARCH]),
		[WRITER_SPECIALIST.AGGREGATOR]: createAggregatorAgent(m[WRITER_SPECIALIST.AGGREGATOR]),
	};

	logger?.info(LOG_SOURCE, 'Building writer graph', {
		hasRetriever: retriever !== undefined,
		specialistCount: Object.keys(WRITER_SPECIALIST).length,
	});

	return new StateGraph(WriterState)
		.addNode(
			WRITER_SPECIALIST.ROUTER,
			withSpecialistLogging(WRITER_SPECIALIST.ROUTER, logger, (state) =>
				routerAgent(state, specialists[WRITER_SPECIALIST.ROUTER], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.RAG_RETRIEVAL,
			withSpecialistLogging(WRITER_SPECIALIST.RAG_RETRIEVAL, logger, (state) =>
				ragRetrievalAgent(
					state,
					specialists[WRITER_SPECIALIST.RAG_RETRIEVAL],
					retriever,
					logger
				)
			)
		)
		.addNode(
			WRITER_SPECIALIST.SEARCH,
			withSpecialistLogging(WRITER_SPECIALIST.SEARCH, logger, (state) =>
				searchAgent(state, specialists[WRITER_SPECIALIST.SEARCH], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.AGGREGATOR,
			withSpecialistLogging(WRITER_SPECIALIST.AGGREGATOR, logger, (state) =>
				aggregatorAgent(state, specialists[WRITER_SPECIALIST.AGGREGATOR], logger)
			)
		)
		.addEdge(START, WRITER_SPECIALIST.ROUTER)
		.addConditionalEdges(WRITER_SPECIALIST.ROUTER, routeAfterRouter, [
			WRITER_SPECIALIST.RAG_RETRIEVAL,
			WRITER_SPECIALIST.SEARCH,
			WRITER_SPECIALIST.AGGREGATOR,
		])
		.addEdge(
			[WRITER_SPECIALIST.RAG_RETRIEVAL, WRITER_SPECIALIST.SEARCH],
			WRITER_SPECIALIST.AGGREGATOR
		)
		.addEdge(WRITER_SPECIALIST.AGGREGATOR, END)
		.compile();
}
