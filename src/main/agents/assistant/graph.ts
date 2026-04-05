import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import type { RagRetriever } from '../rag';
import { assistantNodeDefinitions, ASSISTANT_NODE, type AssistantNodeName } from './nodes';
import type { AssistantSpecialistAgent } from './specialist-agent';
import { AssistantState, type AssistantGraphState } from './state';

const LOG_SOURCE = 'AssistantGraph';

export const ASSISTANT_SPECIALIST = ASSISTANT_NODE;

export interface AssistantSpecialistModels {
	[ASSISTANT_NODE.INTENT_ANALYZER]: BaseChatModel;
	[ASSISTANT_NODE.RAG_RETRIEVAL]: BaseChatModel;
	[ASSISTANT_NODE.WEB_RESEARCH]: BaseChatModel;
	[ASSISTANT_NODE.RESPONSE_PREPARER]: BaseChatModel;
}

type AssistantSpecialistResult = Partial<AssistantGraphState>;
type AssistantSpecialistRunner = (state: AssistantGraphState) => Promise<AssistantSpecialistResult>;

function routeAfterIntent(
	state: AssistantGraphState
):
	| typeof ASSISTANT_NODE.RESPONSE_PREPARER
	| [typeof ASSISTANT_NODE.RAG_RETRIEVAL, typeof ASSISTANT_NODE.WEB_RESEARCH] {
	if (!state.needsParallelResearch) {
		return ASSISTANT_NODE.RESPONSE_PREPARER;
	}

	return [ASSISTANT_NODE.RAG_RETRIEVAL, ASSISTANT_NODE.WEB_RESEARCH];
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
		[ASSISTANT_NODE.INTENT_ANALYZER]:
			assistantNodeDefinitions[ASSISTANT_NODE.INTENT_ANALYZER].create(
				m[ASSISTANT_NODE.INTENT_ANALYZER]
			),
		[ASSISTANT_NODE.RAG_RETRIEVAL]:
			assistantNodeDefinitions[ASSISTANT_NODE.RAG_RETRIEVAL].create(
				m[ASSISTANT_NODE.RAG_RETRIEVAL]
			),
		[ASSISTANT_NODE.WEB_RESEARCH]:
			assistantNodeDefinitions[ASSISTANT_NODE.WEB_RESEARCH].create(
				m[ASSISTANT_NODE.WEB_RESEARCH]
			),
		[ASSISTANT_NODE.RESPONSE_PREPARER]:
			assistantNodeDefinitions[ASSISTANT_NODE.RESPONSE_PREPARER].create(
				m[ASSISTANT_NODE.RESPONSE_PREPARER]
			),
	};

	logger?.info(LOG_SOURCE, 'Building assistant graph', {
		hasRetriever: retriever !== undefined,
		nodeCount: Object.keys(ASSISTANT_NODE).length,
	});

	return new StateGraph(AssistantState)
		.addNode(
			ASSISTANT_NODE.INTENT_ANALYZER,
			withNodeLogging(ASSISTANT_NODE.INTENT_ANALYZER, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.INTENT_ANALYZER].run(
					state,
					nodes[ASSISTANT_NODE.INTENT_ANALYZER],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.RAG_RETRIEVAL,
			withNodeLogging(ASSISTANT_NODE.RAG_RETRIEVAL, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.RAG_RETRIEVAL].run(
					state,
					nodes[ASSISTANT_NODE.RAG_RETRIEVAL],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.WEB_RESEARCH,
			withNodeLogging(ASSISTANT_NODE.WEB_RESEARCH, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.WEB_RESEARCH].run(
					state,
					nodes[ASSISTANT_NODE.WEB_RESEARCH],
					nodeContext
				)
			)
		)
		.addNode(
			ASSISTANT_NODE.RESPONSE_PREPARER,
			withNodeLogging(ASSISTANT_NODE.RESPONSE_PREPARER, logger, (state) =>
				assistantNodeDefinitions[ASSISTANT_NODE.RESPONSE_PREPARER].run(
					state,
					nodes[ASSISTANT_NODE.RESPONSE_PREPARER],
					nodeContext
				)
			)
		)
		.addEdge(START, ASSISTANT_NODE.INTENT_ANALYZER)
		.addConditionalEdges(ASSISTANT_NODE.INTENT_ANALYZER, routeAfterIntent, [
			ASSISTANT_NODE.RAG_RETRIEVAL,
			ASSISTANT_NODE.WEB_RESEARCH,
			ASSISTANT_NODE.RESPONSE_PREPARER,
		])
		.addEdge(
			[ASSISTANT_NODE.RAG_RETRIEVAL, ASSISTANT_NODE.WEB_RESEARCH],
			ASSISTANT_NODE.RESPONSE_PREPARER
		)
		.addEdge(ASSISTANT_NODE.RESPONSE_PREPARER, END)
		.compile();
}
