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
 *    streams via `streamMode: ['messages', 'values']` to forward token events
 *    incrementally, then calls `extractGraphOutput(finalState)` as a fallback
 *    for any post-processed content not captured in the token stream.
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
import type { GraphInputContext, NodeModelMap } from './definition';

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
	 * Pre-resolved per-node models. When supplied alongside `buildGraph`,
	 * the map is passed to `buildGraph` instead of the single model.
	 */
	nodeModels?: NodeModelMap;
	/**
	 * LangGraph factory — when supplied the executor runs the graph path.
	 * The factory receives the already-configured streaming model.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph?: (
		models: BaseChatModel | NodeModelMap
	) => CompiledStateGraph<any, any, any, any, any, any>;
	/**
	 * Custom-state graph hooks (must be provided as a pair).
	 * When present, the executor uses the custom-state protocol instead of
	 * the messages protocol. See `AgentDefinition` for full documentation.
	 */
	buildGraphInput?: (ctx: GraphInputContext) => Record<string, unknown>;
	extractGraphOutput?: (state: Record<string, unknown>) => string;
	extractThinkingLabel?: (state: Record<string, unknown>) => string | undefined;
	/**
	 * When present, only tokens from these nodes are forwarded to the caller.
	 * See `AgentDefinition.streamableNodes` for full documentation.
	 */
	streamableNodes?: string[];
	/** Optional task-level metadata forwarded to buildGraphInput. */
	metadata?: Record<string, unknown>;
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
		nodeModels,
		buildGraph,
		buildGraphInput,
		extractGraphOutput,
		extractThinkingLabel,
		streamableNodes,
		metadata,
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
			metadata,
			history,
		};
		yield* executeCustomStateGraphStream({
			runId,
			model,
			nodeModels,
			ctx,
			buildGraph: buildGraph as NonNullable<typeof buildGraph>,
			buildGraphInput: buildGraphInput as NonNullable<typeof buildGraphInput>,
			extractGraphOutput: extractGraphOutput as NonNullable<typeof extractGraphOutput>,
			extractThinkingLabel,
			streamableNodes,
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
			buildGraph: buildGraph as NonNullable<typeof buildGraph>,
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
// Uses combined streamMode:['messages','values'] which yields both token-level
// streaming chunks (from LLM calls within nodes) and full state snapshots
// after each node completes. Token events are forwarded incrementally to the
// caller; the last state snapshot is used with extractGraphOutput to produce
// the final content string.
//
// This path is for agents with domain-specific state shapes (e.g. WriterState)
// whose nodes call the LLM internally and return a plain string field rather
// than appending to a messages channel.

interface CustomStateGraphStreamInput {
	runId: string;
	model: BaseChatModel;
	nodeModels?: NodeModelMap;
	ctx: GraphInputContext;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph: (
		models: BaseChatModel | NodeModelMap
	) => CompiledStateGraph<any, any, any, any, any, any>;
	buildGraphInput: (ctx: GraphInputContext) => Record<string, unknown>;
	extractGraphOutput: (state: Record<string, unknown>) => string;
	extractThinkingLabel?: (state: Record<string, unknown>) => string | undefined;
	streamableNodes?: string[];
	signal?: AbortSignal;
	logger?: LoggerService;
}

async function* executeCustomStateGraphStream(
	input: CustomStateGraphStreamInput
): AsyncGenerator<AgentStreamEvent> {
	const {
		runId,
		model,
		nodeModels,
		ctx,
		buildGraph,
		buildGraphInput,
		extractGraphOutput,
		extractThinkingLabel,
		streamableNodes,
		signal,
		logger,
	} = input;

	// Build a Set once for O(1) lookups; undefined means "stream all nodes".
	const allowedNodes = streamableNodes !== undefined ? new Set(streamableNodes) : undefined;

	try {
		const graph = nodeModels ? buildGraph(nodeModels) : buildGraph(model);
		const initialState = buildGraphInput(ctx);

		let fullContent = '';
		let tokenCount = 0;
		let finalState: Record<string, unknown> = {};
		let lastThinkingLabel: string | undefined;

		// Combined stream mode: 'messages' for token-level streaming,
		// 'values' for final state snapshots used by extractGraphOutput.
		const stream = await graph.stream(initialState, {
			streamMode: ['messages', 'values'],
			signal: signal as AbortSignal | undefined,
		});

		for await (const event of stream) {
			if (signal?.aborted) break;

			const [mode, data] = event as [string, unknown];

			if (mode === 'messages') {
				const [chunk, metadata] = data as [unknown, Record<string, unknown>];
				if (!chunk) continue;

				// Skip the final complete AIMessage emitted after all streaming deltas
				if (chunk instanceof AIMessage) continue;

				// When streamableNodes is declared, only forward tokens from listed nodes.
				const nodeName =
					typeof metadata?.['langgraph_node'] === 'string' ? metadata['langgraph_node'] : undefined;
				if (allowedNodes !== undefined && (nodeName === undefined || !allowedNodes.has(nodeName))) {
					continue;
				}

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
			} else if (mode === 'values') {
				finalState = data as Record<string, unknown>;
				const nextThinkingLabel = extractThinkingLabel?.(finalState)?.trim();
				if (nextThinkingLabel && nextThinkingLabel !== lastThinkingLabel) {
					lastThinkingLabel = nextThinkingLabel;
					yield { type: 'thinking', content: nextThinkingLabel, runId };
				}
			}
		}

		if (signal?.aborted) {
			yield { type: 'error', error: 'Cancelled', code: 'abort', runId };
			return;
		}

		// extractGraphOutput is the authoritative source for the final result
		// content. Streamed tokens serve real-time UI delivery and may only
		// represent a subset of the graph's work (e.g. a refinement node
		// streams tokens but a subsequent generation node produces the actual
		// output). Fall back to accumulated streamed content only when
		// extractGraphOutput returns an empty string (e.g. graph error or
		// incomplete state).
		const extractedContent = extractGraphOutput(finalState);
		const content = extractedContent || fullContent;

		logger?.info(
			LOG_PREFIX,
			`run=${runId} custom-state graph completed: ${content.length} chars, ${tokenCount} tokens`
		);

		yield { type: 'done', content, tokenCount, runId };
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
	buildGraph: (
		models: BaseChatModel | NodeModelMap
	) => CompiledStateGraph<any, any, any, any, any, any>;
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
