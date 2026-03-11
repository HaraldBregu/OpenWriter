/**
 * AgentExecutor — consolidated LangChain streaming generator.
 *
 * Supports three execution paths:
 *
 * 1. Plain chat completion — when no `buildGraph` is supplied.
 *    Uses `model.stream(messages)` and yields token events.
 *
 * 2. LangGraph messages protocol — when `buildGraph` is supplied but
 *    `buildGraphInput` / `extractGraphOutput` are absent.
 *    Passes `{ messages: [...] }` as initial state and streams via
 *    `streamMode: 'messages'`, yielding token events per chunk.
 *
 * 3. LangGraph custom-state protocol — when `buildGraph`, `buildGraphInput`,
 *    AND `extractGraphOutput` are all supplied.
 *    Calls `buildGraphInput(ctx)` to construct domain-specific initial state,
 *    runs the graph to completion via `streamMode: 'values'`, then calls
 *    `extractGraphOutput(finalState)` to pull the content string and emits a
 *    single `done` event (no incremental token events).
 */

import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { CompiledStateGraph } from '@langchain/langgraph';
import type { ResolvedProvider } from '../../shared/provider-resolver';
import { extractTokenFromChunk, classifyError, toUserMessage } from '../../shared/ai-utils';
import { createChatModel } from '../../shared/chat-model-factory';
import type { AgentStreamEvent } from './types';
import type { AgentHistoryMessage } from './types';
import type { LoggerService } from '../../services/logger';
import type { GraphInputContext } from './definition';

const LOG_PREFIX = 'AgentExecutor';

export interface ExecutorInput {
	runId: string;
	provider: ResolvedProvider;
	systemPrompt: string;
	temperature: number;
	maxTokens: number | undefined;
	history: AgentHistoryMessage[];
	prompt: string;
	signal?: AbortSignal;
	logger?: LoggerService;
	/**
	 * LangGraph factory — when supplied the executor runs the graph path.
	 * The factory receives the already-configured streaming model.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph?: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>;
	/**
	 * Custom-state graph hooks (must be provided as a pair).
	 * When present, the executor uses the custom-state protocol instead of
	 * the messages protocol. See `AgentDefinition` for full documentation.
	 */
	buildGraphInput?: (ctx: GraphInputContext) => Record<string, unknown>;
	extractGraphOutput?: (state: Record<string, unknown>) => string;
}

/**
 * Core streaming generator. Yields `AgentStreamEvent` items.
 *
 * The caller is responsible for collecting the full response and
 * appending it to session history.
 */
export async function* executeAIAgentsStream(
	input: ExecutorInput
): AsyncGenerator<AgentStreamEvent> {
	const {
		runId,
		provider,
		systemPrompt,
		temperature,
		maxTokens,
		history,
		prompt,
		signal,
		buildGraph,
		buildGraphInput,
		extractGraphOutput,
		logger,
	} = input;
	const { apiKey, modelName } = provider;

	const graphMode =
		buildGraph !== undefined && buildGraphInput !== undefined && extractGraphOutput !== undefined
			? 'custom-state'
			: buildGraph !== undefined
				? 'messages'
				: 'plain';

	logger?.info(
		LOG_PREFIX,
		`run=${runId} provider=${provider.providerId} model=${modelName} temp=${temperature} maxTokens=${maxTokens ?? 'unlimited'} graph=${graphMode}`
	);

	// --- Build LangChain model (used by plain and messages-protocol paths) ---

	const model = createChatModel({
		providerId: provider.providerId,
		apiKey,
		modelName,
		streaming: true,
		temperature,
		maxTokens,
	});

	// --- Custom-state graph path ---------------------------------------------

	if (graphMode === 'custom-state') {
		const ctx: GraphInputContext = {
			prompt,
			apiKey,
			modelName,
			providerId: provider.providerId,
			temperature,
		};
		yield* executeCustomStateGraphStream({
			runId,
			model,
			ctx,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			buildGraph: buildGraph!,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			buildGraphInput: buildGraphInput!,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			extractGraphOutput: extractGraphOutput!,
			signal,
			logger,
		});
		return;
	}

	// --- Messages-protocol graph path ----------------------------------------

	const langchainMessages = [
		new SystemMessage(systemPrompt),
		...history.map((m) =>
			m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
		),
		new HumanMessage(prompt),
	];

	if (graphMode === 'messages') {
		yield* executeMessagesGraphStream({
			runId,
			model,
			langchainMessages,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			buildGraph: buildGraph!,
			signal,
			logger,
		});
		return;
	}

	// --- Plain chat completion path ------------------------------------------

	let fullContent = '';
	let tokenCount = 0;

	try {
		const stream = await model.stream(langchainMessages, { signal });

		for await (const chunk of stream) {
			if (signal?.aborted) break;

			const token = extractTokenFromChunk(chunk.content);
			if (token) {
				fullContent += token;
				tokenCount++;
				yield { type: 'token', token, runId };
			}
		}

		logger?.info(
			LOG_PREFIX,
			`run=${runId} completed: ${tokenCount} tokens, ${fullContent.length} chars`
		);
		yield { type: 'done', content: fullContent, tokenCount, runId };
	} catch (error: unknown) {
		const kind = classifyError(error);

		if (kind === 'abort') {
			yield { type: 'error', error: 'Cancelled', code: 'abort', runId };
			return;
		}

		const rawMessage = error instanceof Error ? error.message : String(error);
		logger?.error(LOG_PREFIX, `run=${runId} error (${kind}): ${rawMessage}`);

		yield { type: 'error', error: toUserMessage(kind, rawMessage), code: kind, runId };
	}
}

// ---------------------------------------------------------------------------
// Custom-state graph sub-generator
// ---------------------------------------------------------------------------
//
// Uses streamMode:'values' which yields a full state snapshot after each node
// completes. We keep the last snapshot and call extractGraphOutput once the
// stream ends. No token events are emitted — the caller receives a single
// 'done' event with the full content string.
//
// This path is for agents with domain-specific state shapes (e.g. WriterState)
// whose nodes call the LLM internally and return a plain string field rather
// than appending to a messages channel.

interface CustomStateGraphStreamInput {
	runId: string;
	model: BaseChatModel;
	ctx: GraphInputContext;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>;
	buildGraphInput: (ctx: GraphInputContext) => Record<string, unknown>;
	extractGraphOutput: (state: Record<string, unknown>) => string;
	signal?: AbortSignal;
	logger?: LoggerService;
}

async function* executeCustomStateGraphStream(
	input: CustomStateGraphStreamInput
): AsyncGenerator<AgentStreamEvent> {
	const { runId, model, ctx, buildGraph, buildGraphInput, extractGraphOutput, signal, logger } =
		input;

	try {
		const graph = buildGraph(model);
		const initialState = buildGraphInput(ctx);

		// streamMode:'values' yields one full state snapshot per node completion.
		// We accumulate them and use the last one as the final state.
		let finalState: Record<string, unknown> = {};

		const stream = graph.stream(initialState, {
			streamMode: 'values',
			signal: signal as AbortSignal | undefined,
		});

		for await (const snapshot of stream) {
			if (signal?.aborted) break;
			// Each snapshot IS the full current state — keep the latest
			finalState = snapshot as Record<string, unknown>;
		}

		if (signal?.aborted) {
			yield { type: 'error', error: 'Cancelled', code: 'abort', runId };
			return;
		}

		const content = extractGraphOutput(finalState);

		logger?.info(
			LOG_PREFIX,
			`run=${runId} custom-state graph completed: ${content.length} chars`
		);

		// tokenCount is not meaningful for a non-streaming node execution;
		// report 0 so the contract is satisfied without fabricating a number.
		yield { type: 'done', content, tokenCount: 0, runId };
	} catch (error: unknown) {
		const kind = classifyError(error);

		if (kind === 'abort') {
			yield { type: 'error', error: 'Cancelled', code: 'abort', runId };
			return;
		}

		const rawMessage = error instanceof Error ? error.message : String(error);
		logger?.error(LOG_PREFIX, `run=${runId} custom-state graph error (${kind}): ${rawMessage}`);

		yield { type: 'error', error: toUserMessage(kind, rawMessage), code: kind, runId };
	}
}

// ---------------------------------------------------------------------------
// Messages-protocol graph sub-generator
// ---------------------------------------------------------------------------
//
// Original path: passes { messages: [...] } as initial state and streams
// individual tokens via streamMode:'messages'. Retained unchanged for graphs
// whose state includes a messages channel.

interface MessagesGraphStreamInput {
	runId: string;
	model: BaseChatModel;
	langchainMessages: (HumanMessage | AIMessage | SystemMessage)[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>;
	signal?: AbortSignal;
	logger?: LoggerService;
}

async function* executeMessagesGraphStream(
	input: MessagesGraphStreamInput
): AsyncGenerator<AgentStreamEvent> {
	const { runId, model, langchainMessages, buildGraph, signal, logger } = input;

	let fullContent = '';
	let tokenCount = 0;

	try {
		const graph = buildGraph(model);

		const stream = await graph.stream(
			{ messages: langchainMessages },
			{ streamMode: 'messages', signal: signal as AbortSignal | undefined }
		);

		for await (const item of stream) {
			if (signal?.aborted) break;

			// streamMode:"messages" yields [chunk, metadata] tuples
			const [chunk] = Array.isArray(item) ? item : [item, {}];

			if (!chunk) continue;

			// Skip the final complete AIMessage that LangGraph emits after all
			// streaming AIMessageChunk deltas. Only process incremental chunks.
			if (chunk instanceof AIMessage) continue;

			// Extract text token from the chunk content
			const token = extractTokenFromChunk(
				typeof chunk === 'object' && chunk !== null && 'content' in chunk
					? (chunk as { content: unknown }).content
					: ''
			);

			if (token) {
				fullContent += token;
				tokenCount++;
				yield { type: 'token', token, runId };
			}
		}

		logger?.info(
			LOG_PREFIX,
			`run=${runId} messages graph completed: ${tokenCount} tokens, ${fullContent.length} chars`
		);
		yield { type: 'done', content: fullContent, tokenCount, runId };
	} catch (error: unknown) {
		const kind = classifyError(error);

		if (kind === 'abort') {
			yield { type: 'error', error: 'Cancelled', code: 'abort', runId };
			return;
		}

		const rawMessage = error instanceof Error ? error.message : String(error);
		logger?.error(LOG_PREFIX, `run=${runId} messages graph error (${kind}): ${rawMessage}`);

		yield { type: 'error', error: toUserMessage(kind, rawMessage), code: kind, runId };
	}
}
