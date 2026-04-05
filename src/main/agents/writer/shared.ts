import type { AgentHistoryMessage } from '../core';
import {
	completeOpenAICompatibleChat,
	streamOpenAICompatibleChat,
	type OpenAICompatibleMessage,
} from '../../shared/openai-compatible-client';
import type { ResolvedProvider } from '../../shared/provider-resolver';

const MAX_HISTORY_MESSAGES = 8;

export interface WriterNodeContext {
	provider: ResolvedProvider;
	history: AgentHistoryMessage[];
	prompt: string;
	temperature: number;
	maxTokens?: number;
	signal?: AbortSignal;
}

interface WriterNodeRequest extends WriterNodeContext {
	systemPrompt: string;
	userContext?: string[];
}

function buildUserMessage(prompt: string, userContext?: string[]): string {
	const sections = [`User request:\n${prompt}`];

	if (userContext && userContext.length > 0) {
		sections.push(...userContext.filter((section) => section.trim().length > 0));
	}

	return sections.join('\n\n');
}

export function buildWriterMessages(
	systemPrompt: string,
	history: AgentHistoryMessage[],
	prompt: string,
	userContext?: string[]
): OpenAICompatibleMessage[] {
	const recentHistory = history
		.slice(-MAX_HISTORY_MESSAGES)
		.map<OpenAICompatibleMessage>((message) => ({
			role: message.role,
			content: message.content,
		}));

	return [
		{ role: 'system', content: systemPrompt },
		...recentHistory,
		{ role: 'user', content: buildUserMessage(prompt, userContext) },
	];
}

export function completeWriterNode(request: WriterNodeRequest): Promise<string> {
	return completeOpenAICompatibleChat({
		provider: request.provider,
		messages: buildWriterMessages(
			request.systemPrompt,
			request.history,
			request.prompt,
			request.userContext
		),
		temperature: request.temperature,
		maxTokens: request.maxTokens,
		signal: request.signal,
	});
}

export function streamWriterNode(request: WriterNodeRequest): AsyncGenerator<string> {
	return streamOpenAICompatibleChat({
		provider: request.provider,
		messages: buildWriterMessages(
			request.systemPrompt,
			request.history,
			request.prompt,
			request.userContext
		),
		temperature: request.temperature,
		maxTokens: request.maxTokens,
		signal: request.signal,
	});
}
