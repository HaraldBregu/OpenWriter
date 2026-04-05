import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LoggerService } from '../../../services/logger';
import type { AssistantSpecialistAgent } from '../specialist-agent';
import type { AssistantGraphState, AssistantGraphUpdate } from '../state';
import { createRouteQuestionAgent, routeQuestionAgent } from './route-question';
import {
	createRetrieveDocumentsAgent,
	retrieveDocumentsAgent,
	type RagRetriever,
} from './retrieve-documents';
import { createGradeDocumentsAgent, gradeDocumentsAgent } from './grade-documents';
import { createRewriteQueryAgent, rewriteQueryAgent } from './rewrite-query';
import {
	createGenerateDirectAnswerAgent,
	generateDirectAnswerAgent,
} from './generate-direct-answer';
import { createGenerateAnswerAgent, generateAnswerAgent } from './generate-answer';
import {
	createReturnFallbackResponseAgent,
	returnFallbackResponseAgent,
} from './return-fallback-response';

export const ASSISTANT_NODE = {
	ROUTE_QUESTION: 'route_question',
	GENERATE_DIRECT_ANSWER: 'generate_direct_answer',
	RETRIEVE_DOCUMENTS: 'retrieve_documents',
	GRADE_DOCUMENTS: 'grade_documents',
	REWRITE_QUERY: 'rewrite_query',
	RETURN_FALLBACK_RESPONSE: 'return_fallback_response',
	GENERATE_ANSWER: 'generate_answer',
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
	[ASSISTANT_NODE.ROUTE_QUESTION]: {
		create: createRouteQuestionAgent,
		run: (state, agent, context) => routeQuestionAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.GENERATE_DIRECT_ANSWER]: {
		create: createGenerateDirectAnswerAgent,
		run: (state, agent, context) => generateDirectAnswerAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.RETRIEVE_DOCUMENTS]: {
		create: createRetrieveDocumentsAgent,
		run: (state, agent, context) =>
			retrieveDocumentsAgent(state, agent, context.retriever, context.logger),
	},
	[ASSISTANT_NODE.GRADE_DOCUMENTS]: {
		create: createGradeDocumentsAgent,
		run: (state, agent, context) => gradeDocumentsAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.REWRITE_QUERY]: {
		create: createRewriteQueryAgent,
		run: (state, agent, context) => rewriteQueryAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.RETURN_FALLBACK_RESPONSE]: {
		create: createReturnFallbackResponseAgent,
		run: (state, agent, context) => returnFallbackResponseAgent(state, agent, context.logger),
	},
	[ASSISTANT_NODE.GENERATE_ANSWER]: {
		create: createGenerateAnswerAgent,
		run: (state, agent, context) => generateAnswerAgent(state, agent, context.logger),
	},
};
