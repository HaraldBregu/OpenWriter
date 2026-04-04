import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentHistoryMessage } from '../../core/types';
import type { RagRetriever, RetrievedDocument } from '../../assistant/agents/rag-retriever';
import type { LoggerService } from '../../../services/logger';

export type WriterRetrievalStrategy = 'required' | 'helpful' | 'skip';

export interface WriterPromptAnalysis {
	normalizedPrompt: string;
	taskType: string;
	responsePlan: string;
	retrievalStrategy: WriterRetrievalStrategy;
	retrievalQuery: string;
	answerConstraints: string;
}

export interface WriterWorkflowInput {
	prompt: string;
	history?: AgentHistoryMessage[];
}

export interface WriterWorkflowResult {
	analysis: WriterPromptAnalysis;
	retrievedDocuments: RetrievedDocument[];
	retrievalStatus: string;
	retrievalContext: string;
	response: string;
}

export interface WriterWorkflow {
	run(input: WriterWorkflowInput): Promise<WriterWorkflowResult>;
}

export interface CreateWriterWorkflowOptions {
	model: BaseChatModel;
	retriever?: RagRetriever;
	logger?: LoggerService;
	maxDocuments?: number;
}

export interface CreateWorkspaceWriterWorkflowOptions {
	apiKey: string;
	providerId: string;
	modelName: string;
	workspacePath?: string;
	temperature?: number;
	maxTokens?: number;
	logger?: LoggerService;
	maxDocuments?: number;
}
