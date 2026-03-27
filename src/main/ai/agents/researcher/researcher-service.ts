/**
 * ResearcherService — orchestrates the researcher pipeline end-to-end.
 *
 * Responsibilities:
 *   - Resolves provider credentials via ProviderResolver
 *   - Creates per-node chat models with appropriate temperatures
 *   - Builds and streams the LangGraph researcher graph
 *   - Detects phase transitions from state snapshots and fires callbacks
 *   - Manages AbortControllers for per-session and per-window cancellation
 *   - Implements Disposable for clean shutdown
 *
 * The compose node is the only streaming node; tokens from all other nodes
 * are suppressed. Phase transition callbacks are driven by value snapshots
 * so the UI progress indicator always reflects real pipeline state.
 */

import { AIMessage } from '@langchain/core/messages';
import type { Disposable } from '../../../core/service-container';
import type { LoggerService } from '../../../services/logger';
import type { ProviderResolver } from '../../../shared/provider-resolver';
import { createChatModel } from '../../../shared/chat-model-factory';
import { extractTokenFromChunk, classifyError, toUserMessage } from '../../../shared/ai-utils';
import type { ResearcherPhase } from '../../../../shared/types';
import { buildResearcherGraph, RESEARCHER_NODE } from './graph';

const LOG_PREFIX = 'ResearcherService';

/** Options forwarded from the IPC payload to the query call. */
export interface ResearcherQueryOptions {
	providerId?: string;
	modelId?: string;
	temperature?: number;
	maxTokens?: number;
}

/** Final result passed to `onDone`. */
export interface ResearchResult {
	response: string;
	tokenCount: number;
	sessionId: string;
	intent: string;
	plan: string[];
}

/** Callback surface consumed by ResearcherIpc to push events to the renderer. */
export interface ResearcherCallbacks {
	onToken: (token: string, sessionId: string) => void;
	onPhase?: (phase: ResearcherPhase, sessionId: string) => void;
	onDone: (result: ResearchResult, sessionId: string) => void;
	onError: (error: string, code: string, sessionId: string) => void;
}

interface SessionEntry {
	controller: AbortController;
	windowId?: number;
}

/** Temperatures tuned per node role. */
const NODE_TEMPERATURES = {
	understand: 0.1,
	plan: 0.2,
	research: 0.3,
} as const;

export class ResearcherService implements Disposable {
	private readonly sessions = new Map<string, SessionEntry>();

	constructor(
		private readonly providerResolver: ProviderResolver,
		private readonly logger?: LoggerService
	) {}

	/**
	 * Execute a researcher query for the given `sessionId`.
	 *
	 * The method returns immediately after setting up the session. Streaming
	 * events are delivered asynchronously through `callbacks`. The caller
	 * should not await this method — it is fire-and-forget by design.
	 */
	async query(
		prompt: string,
		sessionId: string,
		callbacks: ResearcherCallbacks,
		options?: ResearcherQueryOptions,
		windowId?: number
	): Promise<void> {
		const controller = new AbortController();
		this.sessions.set(sessionId, { controller, windowId });

		callbacks.onPhase?.('understanding', sessionId);

		try {
			const resolved = this.providerResolver.resolve({
				providerId: options?.providerId,
				modelId: options?.modelId,
			});

			const { apiKey, modelName, providerId } = resolved;
			const composeTemperature = options?.temperature ?? 0.7;
			const maxTokens = options?.maxTokens;

			const models = {
				understand: createChatModel({
					providerId,
					apiKey,
					modelName,
					streaming: false,
					temperature: NODE_TEMPERATURES.understand,
					maxTokens,
				}),
				plan: createChatModel({
					providerId,
					apiKey,
					modelName,
					streaming: false,
					temperature: NODE_TEMPERATURES.plan,
					maxTokens,
				}),
				research: createChatModel({
					providerId,
					apiKey,
					modelName,
					streaming: false,
					temperature: NODE_TEMPERATURES.research,
					maxTokens,
				}),
				compose: createChatModel({
					providerId,
					apiKey,
					modelName,
					streaming: true,
					temperature: composeTemperature,
					maxTokens,
				}),
			};

			const graph = buildResearcherGraph(models);
			const initialState = { prompt };

			const stream = await graph.stream(initialState, {
				streamMode: ['messages', 'values'],
				signal: controller.signal,
			});

			let tokenCount = 0;
			let finalResponse = '';
			let finalIntent = '';
			let finalPlan: string[] = [];

			// Track which phases have already been announced to avoid duplicates.
			let planningAnnounced = false;
			let researchingAnnounced = false;
			let composingAnnounced = false;

			for await (const event of stream) {
				if (controller.signal.aborted) break;

				const [mode, data] = event as [string, unknown];

				if (mode === 'messages') {
					const [chunk, metadata] = data as [unknown, Record<string, unknown>];
					if (!chunk) continue;

					// Skip the consolidated AIMessage emitted after all streaming deltas.
					if (chunk instanceof AIMessage) continue;

					const nodeName =
						typeof metadata?.['langgraph_node'] === 'string'
							? metadata['langgraph_node']
							: undefined;

					// Only forward tokens from the compose node.
					if (nodeName !== RESEARCHER_NODE.COMPOSE) continue;

					const token = extractTokenFromChunk(
						typeof chunk === 'object' && chunk !== null && 'content' in chunk
							? (chunk as { content: unknown }).content
							: ''
					);

					if (token) {
						finalResponse += token;
						tokenCount++;
						callbacks.onToken(token, sessionId);
					}
				} else if (mode === 'values') {
					const snapshot = data as Record<string, unknown>;

					// Derive phase transitions from state snapshot fields becoming populated.
					const hasIntent = typeof snapshot['intent'] === 'string' && snapshot['intent'].length > 0;
					const hasPlan = Array.isArray(snapshot['plan']) && snapshot['plan'].length > 0;
					const hasResearch =
						typeof snapshot['research'] === 'string' && snapshot['research'].length > 0;

					if (hasIntent && !planningAnnounced) {
						planningAnnounced = true;
						callbacks.onPhase?.('planning', sessionId);
					}

					if (hasPlan && !researchingAnnounced) {
						researchingAnnounced = true;
						callbacks.onPhase?.('researching', sessionId);
					}

					if (hasResearch && !composingAnnounced) {
						composingAnnounced = true;
						callbacks.onPhase?.('composing', sessionId);
					}

					// Capture final state values for the done callback.
					if (typeof snapshot['intent'] === 'string') {
						finalIntent = snapshot['intent'];
					}
					if (Array.isArray(snapshot['plan'])) {
						finalPlan = snapshot['plan'] as string[];
					}
					if (typeof snapshot['response'] === 'string' && snapshot['response'].length > 0) {
						finalResponse = snapshot['response'];
					}
				}
			}

			if (controller.signal.aborted) {
				callbacks.onError('Cancelled', 'abort', sessionId);
				return;
			}

			this.logger?.info(
				LOG_PREFIX,
				`session=${sessionId} completed: ${tokenCount} tokens, ${finalResponse.length} chars`
			);

			callbacks.onDone(
				{
					response: finalResponse,
					tokenCount,
					sessionId,
					intent: finalIntent,
					plan: finalPlan,
				},
				sessionId
			);
		} catch (error: unknown) {
			const kind = classifyError(error);

			if (kind === 'abort') {
				callbacks.onError('Cancelled', 'abort', sessionId);
				return;
			}

			const rawMessage = error instanceof Error ? error.message : String(error);
			this.logger?.error(LOG_PREFIX, `session=${sessionId} error (${kind}): ${rawMessage}`);
			callbacks.onError(toUserMessage(kind, rawMessage), kind, sessionId);
		} finally {
			this.sessions.delete(sessionId);
		}
	}

	/**
	 * Cancel an active session by its ID.
	 * Returns `true` if the session was found and cancelled, `false` otherwise.
	 */
	cancel(sessionId: string): boolean {
		const entry = this.sessions.get(sessionId);
		if (!entry) return false;

		entry.controller.abort();
		this.sessions.delete(sessionId);
		return true;
	}

	/**
	 * Cancel all active sessions owned by a window.
	 * Returns the number of sessions cancelled.
	 */
	cancelByWindow(windowId: number): number {
		let count = 0;

		for (const [sessionId, entry] of this.sessions) {
			if (entry.windowId === windowId) {
				entry.controller.abort();
				this.sessions.delete(sessionId);
				count++;
			}
		}

		return count;
	}

	/** Cancel all active sessions and clear internal state. */
	destroy(): void {
		for (const entry of this.sessions.values()) {
			entry.controller.abort();
		}
		this.sessions.clear();
	}
}
