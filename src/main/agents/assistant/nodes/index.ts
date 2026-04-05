import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { RagRetriever } from '../../rag';
import type { LoggerService } from '../../../services/logger';
import {
	createDuckDuckGoSearchAgent,
	duckDuckGoSearchAgent,
} from '../agents/duckduckgo-search-agent';
import { createEnhancerAgent, enhancerAgent } from '../agents/enhancer-agent';
import { createIntentDetectorAgent, intentDetectorAgent } from '../agents/intent-detector-agent';
import { createRagAgent, ragAgent } from '../agents/rag-agent';
import type { AssistantSpecialistAgent } from '../specialist-agent';
import type { AssistantGraphState, AssistantGraphUpdate } from '../state';

export const ASSISTANT_NODE = {
	INTENT_ANALYZER: 'intent_analyzer',
	RAG_RETRIEVAL: 'rag_retrieval',
	WEB_RESEARCH: 'web_research',
	RESPONSE_PREPARER: 'response_preparer',
} as const;

export type AssistantNodeName = (typeof ASSISTANT_NODE)[keyof typeof ASSISTANT_NODE];

export interface AssistantNodeRuntimeContext {
	logger?: LoggerService;
	retriever?: RagRetriever;
}

export interface AssistantNodeDefinition {
	create: (model: BaseChatModel) => AssistantSpecialistAgent;
	run: (
		state: AssistantGraphState,
		agent: AssistantSpecialistAgent,
		context: AssistantNodeRuntimeContext
	) => Promise<AssistantGraphUpdate>;
}

export const assistantNodeDefinitions: Record<AssistantNodeName, AssistantNodeDefinition> = {
	[ASSISTANT_NODE.INTENT_ANALYZER]: {
		create: createIntentDetectorAgent,
		run: (state, agent, context) => intentDetectorAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.RAG_RETRIEVAL]: {
		create: createRagAgent,
		run: (state, agent, context) => ragAgent(state, agent, context.retriever, context.logger),
	},
	[ASSISTANT_NODE.WEB_RESEARCH]: {
		create: createDuckDuckGoSearchAgent,
		run: (state, agent, context) => duckDuckGoSearchAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.RESPONSE_PREPARER]: {
		create: createEnhancerAgent,
		run: (state, agent, context) => enhancerAgent(state, agent, context.logger),
	},
};
