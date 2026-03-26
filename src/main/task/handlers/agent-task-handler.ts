/**
 * AgentTaskHandler — bridge between TaskManager and AI Agents subsystems.
 *
 * One instance per registered agent definition (e.g. 'agent-writing-assistant').
 * Calls executeAIAgentsStream directly — no session management.
 * This is the *only* file that imports from both subsystems, keeping them
 * fully decoupled from each other.
 */

import { randomUUID } from 'node:crypto';
import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';
import type { AgentRegistry, AgentStreamEvent, NodeModelMap } from '../../ai';
import { executeAIAgentsStream } from '../../ai';
import type { ProviderResolver } from '../../shared/provider-resolver';
import { createChatModel } from '../../shared/chat-model-factory';
import type { LoggerService } from '../../services/logger';

// ---------------------------------------------------------------------------
// Input / Output (self-contained — no agent-system type re-exports)
// ---------------------------------------------------------------------------

export interface AgentTaskInput {
	prompt: string;
	providerId?: string;
	modelId?: string;
	temperature?: number;
	maxTokens?: number;
}

export interface AgentTaskOutput {
	content: string;
	tokenCount: number;
	agentId: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class AgentTaskHandler implements TaskHandler<AgentTaskInput, AgentTaskOutput> {
	readonly type: string;

	constructor(
		private readonly agentId: string,
		private readonly agentsRegistry: AgentRegistry,
		private readonly providerResolver: ProviderResolver,
		private readonly logger?: LoggerService
	) {
		this.type = `agent-${agentId}`;
	}

	// -------------------------------------------------------------------------
	// Validate (pre-queue guard)
	// -------------------------------------------------------------------------

	validate(input: AgentTaskInput): void {
		if (!this.agentsRegistry.has(this.agentId)) {
			throw new Error(`Agent "${this.agentId}" is not registered`);
		}
		if (!input?.prompt || typeof input.prompt !== 'string' || input.prompt.trim().length === 0) {
			throw new Error('AgentTaskInput.prompt must be a non-empty string');
		}
	}

	// -------------------------------------------------------------------------
	// Execute
	// -------------------------------------------------------------------------

	async execute(
		input: AgentTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		streamReporter?: StreamReporter,
		metadata?: Record<string, unknown>
	): Promise<AgentTaskOutput> {
		// 1. Resolve agent definition
		const def = this.agentsRegistry.get(this.agentId);
		if (!def) {
			throw new Error(`Agent "${this.agentId}" not found in registry`);
		}
		reporter.progress(5, 'Resolved agent definition');

		// 2. Resolve provider (task input overrides → definition default → global fallback)
		const defaultCfg = def.defaultModel;
		const providerId = input.providerId ?? defaultCfg?.providerId;
		const modelId = input.modelId ?? defaultCfg?.modelId;

		const provider = this.providerResolver.resolve({ providerId, modelId });
		reporter.progress(10, 'Provider resolved');

		// 3. Resolve per-node models when the definition declares them.
		//
		// Why this handler calls createChatModel directly rather than delegating
		// to the executor's internal model construction:
		//
		// The executor owns a single default model, built from the task-level
		// provider resolution (step 2 above). Agents that declare `nodeModels`
		// need one independently-configured model instance per graph node — each
		// with its own provider, API key, and temperature — before the graph is
		// even constructed. That pre-resolution must happen here in the handler,
		// where per-node NodeModelConfig entries are available and the executor's
		// buildGraph signature can receive a ready-made NodeModelMap. The executor
		// receives these pre-built models via the `nodeModels` field of
		// ExecutorInput and passes them straight to buildGraph, bypassing its own
		// single-model path entirely. This keeps the executor agnostic to
		// multi-provider orchestration logic.
		let nodeModels: NodeModelMap | undefined;
		if (def.nodeModels) {
			nodeModels = {};
			for (const [nodeName, cfg] of Object.entries(def.nodeModels)) {
				const nodeProvider = this.providerResolver.resolve({
					providerId: cfg.providerId,
					modelId: cfg.modelId,
				});
				nodeModels[nodeName] = createChatModel({
					providerId: nodeProvider.providerId,
					apiKey: nodeProvider.apiKey,
					modelName: nodeProvider.modelName,
					streaming: true,
					temperature: cfg.temperature,
					maxTokens: cfg.maxTokens,
				});
			}
		}

		// 4. Stream via executor directly
		let content = '';
		let tokenCount = 0;
		let tokensSinceLastProgress = 0;
		let currentProgress = 10;

		const resolvedTemperature = input.temperature ?? defaultCfg?.temperature ?? 0.7;
		const resolvedMaxTokens = input.maxTokens ?? defaultCfg?.maxTokens;

		const gen = executeAIAgentsStream({
			runId: randomUUID(),
			provider,
			systemPrompt: '',
			temperature: resolvedTemperature,
			maxTokens: resolvedMaxTokens,
			history: [],
			prompt: input.prompt,
			signal,
			nodeModels,
			buildGraph: def.buildGraph,
			buildGraphInput: def.buildGraphInput,
			extractGraphOutput: def.extractGraphOutput,
			streamableNodes: def.streamableNodes,
			metadata,
			logger: this.logger,
		});

		for await (const event of gen) {
			this.handleStreamEvent(
				event,
				streamReporter,
				() => {
					tokensSinceLastProgress++;
					if (tokensSinceLastProgress >= 20 && currentProgress < 90) {
						currentProgress = Math.min(currentProgress + 2, 90);
						tokensSinceLastProgress = 0;
						reporter.progress(currentProgress, 'Streaming…');
					}
				},
				(tc) => {
					tokenCount = tc;
				},
				(c) => {
					content = c;
				}
			);
		}

		reporter.progress(100, 'Complete');
		return { content, tokenCount, agentId: this.agentId };
	}

	// -------------------------------------------------------------------------
	// Internal — event dispatch
	// -------------------------------------------------------------------------

	private handleStreamEvent(
		event: AgentStreamEvent,
		streamReporter: StreamReporter | undefined,
		onToken: () => void,
		setTokenCount: (n: number) => void,
		setContent: (s: string) => void
	): void {
		switch (event.type) {
			case 'token':
				streamReporter?.stream(event.token);
				onToken();
				break;

			case 'done':
				setContent(event.content);
				setTokenCount(event.tokenCount);
				break;

			case 'error':
				if (event.code === 'abort') {
					throw new DOMException('Aborted', 'AbortError');
				}
				throw new Error(event.error);

			// 'thinking' events are informational — no action needed
		}
	}
}
