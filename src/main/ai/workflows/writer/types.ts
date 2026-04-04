import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type WriterRetrievalStrategy = 'required' | 'helpful' | 'skip';

export interface WriterHistoryMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface WriterRetrievedDocument {
	pageContent: string;
	metadata: Record<string, unknown>;
	score: number;
}

export interface WriterWorkflowLogger {
	debug?(source: string, message: string, data?: unknown): void;
	info?(source: string, message: string, data?: unknown): void;
	warn?(source: string, message: string, data?: unknown): void;
	error?(source: string, message: string, data?: unknown): void;
}

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
	history?: WriterHistoryMessage[];
}

export interface WriterWorkflowResult {
	analysis: WriterPromptAnalysis;
	retrievedDocuments: WriterRetrievedDocument[];
	retrievalStatus: string;
	retrievalContext: string;
	response: string;
}

export interface WriterRetriever {
	retrieve(query: string): Promise<WriterRetrievedDocument[]>;
}

export interface WriterWorkflow {
	run(input: WriterWorkflowInput): Promise<WriterWorkflowResult>;
}

export interface CreateWriterWorkflowOptions {
	model: BaseChatModel;
	retriever?: WriterRetriever;
	logger?: WriterWorkflowLogger;
	maxDocuments?: number;
}

export interface CreateWorkspaceWriterWorkflowOptions {
	apiKey: string;
	providerId: string;
	modelName: string;
	workspacePath?: string;
	temperature?: number;
	maxTokens?: number;
	logger?: WriterWorkflowLogger;
	maxDocuments?: number;
	embeddingModelName?: string;
}
