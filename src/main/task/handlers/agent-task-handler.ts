/**
 * AgentTaskHandler — bridge between TaskManager and AI Agents subsystems.
 *
 * One instance per registered agent definition (e.g. 'agent-writing-assistant').
 * Calls executeAIAgentsStream directly — no session management.
 * This is the *only* file that imports from both subsystems, keeping them
 * fully decoupled from each other.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';
import type {
	AgentDefinition,
	AgentHistoryMessage,
	AgentRegistry,
	AgentStreamEvent,
	NodeModelMap,
} from '../../agents';
import { executeAIAgentsStream } from '../../agents';
import type { AgentRuntimeContext } from '../../agents/core';
import type { ProviderResolver } from '../../shared/provider-resolver';
import { createChatModel } from '../../shared/chat-model-factory';
import type { LoggerService } from '../../services/logger';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace';
import { DEFAULT_TEXT_MODEL_ID } from '../../../shared/types';
import { DEFAULT_IMAGE_MODEL_ID, findCatalogueModel } from '../../../shared/models';

// ---------------------------------------------------------------------------
// Input / Output (self-contained — no agent-system type re-exports)
// ---------------------------------------------------------------------------

export interface AgentTaskInput {
	prompt: string;
	providerId?: string;
	modelId?: string;
	temperature?: number;
	maxTokens?: number;
	windowId?: number;
	workspacePath?: string;
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
		private readonly windowContextManager: WindowContextManager,
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

		// 2. Resolve provider (task input → document config → shared default → global fallback)
		const documentModelId = await this.loadDocumentModelId(input, metadata);
		const defaultCfg = def.defaultModel;
		const modelId = input.modelId ?? documentModelId ?? DEFAULT_TEXT_MODEL_ID;
		const providerId =
			input.providerId ??
			(documentModelId ? findCatalogueModel(documentModelId)?.providerId : undefined) ??
			defaultCfg?.providerId;

		const provider = this.providerResolver.resolve({ providerId, modelId });

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
		if (def.nodeModels && !def.execute) {
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

		// 4. Prepare graph with runtime context (e.g. RAG retriever injection).
		//
		// When the definition declares `prepareGraph`, we resolve the runtime
		// context (workspace path, provider credentials) and let the definition
		// wrap `buildGraph` with any workspace-bound resources. The executor
		// receives a standard `buildGraph` function — it remains unaware of the
		// injection.
		let effectiveBuildGraph = def.buildGraph;
		const runtimeContext =
			def.prepareGraph || def.execute ? this.resolveRuntimeContext(input, provider) : undefined;
		if (def.prepareGraph && effectiveBuildGraph && runtimeContext) {
			effectiveBuildGraph = def.prepareGraph(effectiveBuildGraph, runtimeContext);
		}

		const history = await this.loadHistory(input, metadata);

		// 5. Stream via executor directly
		let content = '';
		let tokenCount = 0;
		let tokensSinceLastProgress = 0;
		let currentProgress = 10;
		let lastThinkingLabel: string | undefined;

		const resolvedTemperature = input.temperature ?? defaultCfg?.temperature ?? 0.7;
		const resolvedMaxTokens = input.maxTokens ?? defaultCfg?.maxTokens;
		const initialThinkingLabel = this.getInitialThinkingLabel(
			def,
			input.prompt,
			provider.providerId,
			provider.modelName,
			provider.apiKey,
			resolvedTemperature,
			history,
			metadata
		);

		reporter.progress(5);
		reporter.progress(10);
		if (initialThinkingLabel) {
			currentProgress = 15;
			lastThinkingLabel = initialThinkingLabel;
			reporter.progress(currentProgress, initialThinkingLabel);
		}

		const runId = randomUUID();
		const gen = def.execute
			? def.execute({
					runId,
					provider,
					prompt: input.prompt,
					temperature: resolvedTemperature,
					maxTokens: resolvedMaxTokens,
					history,
					signal,
					metadata,
					runtime: runtimeContext ?? this.resolveRuntimeContext(input, provider),
					logger: this.logger,
				})
			: executeAIAgentsStream({
					runId,
					provider,
					systemPrompt: '',
					temperature: resolvedTemperature,
					maxTokens: resolvedMaxTokens,
					history,
					prompt: input.prompt,
					signal,
					nodeModels,
					buildGraph: effectiveBuildGraph,
					buildGraphInput: def.buildGraphInput,
					extractGraphOutput: def.extractGraphOutput,
					extractThinkingLabel: def.extractThinkingLabel,
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
						reporter.progress(currentProgress);
					}
				},
				(message) => {
					const nextMessage = message.trim();
					if (!nextMessage || nextMessage === lastThinkingLabel) return;
					lastThinkingLabel = nextMessage;
					reporter.progress(currentProgress, nextMessage);
				},
				(tc) => {
					tokenCount = tc;
				},
				(c) => {
					content = c;
				}
			);
		}

		reporter.progress(100);
		return { content, tokenCount, agentId: this.agentId };
	}

	// -------------------------------------------------------------------------
	// Internal — event dispatch
	// -------------------------------------------------------------------------

	private handleStreamEvent(
		event: AgentStreamEvent,
		streamReporter: StreamReporter | undefined,
		onToken: () => void,
		onThinking: (message: string) => void,
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

			case 'thinking':
				onThinking(event.content);
				break;

			case 'error':
				if (event.code === 'abort') {
					throw new DOMException('Aborted', 'AbortError');
				}
				throw new Error(event.error);
		}
	}

	private resolveRuntimeContext(
		input: AgentTaskInput,
		provider: { providerId: string; apiKey: string }
	): AgentRuntimeContext {
		const workspaceService = this.resolveWorkspaceService(input);
		return {
			workspaceService,
			apiKey: provider.apiKey,
			providerId: provider.providerId,
			logger: this.logger,
		};
	}

	private resolveWorkspaceService(
		input: AgentTaskInput
	): import('../../workspace/workspace-service').WorkspaceService | undefined {
		const windowContext =
			typeof input.windowId === 'number'
				? this.windowContextManager.tryGet(input.windowId)
				: undefined;
		return windowContext?.container.has('workspace')
			? windowContext.container.get<import('../../workspace/workspace-service').WorkspaceService>(
					'workspace'
				)
			: undefined;
	}

	private resolveWorkspacePath(
		input: AgentTaskInput,
		metadata?: Record<string, unknown>
	): string | undefined {
		const fromService = this.resolveWorkspaceService(input)?.getCurrent() ?? undefined;
		if (fromService) return fromService;

		const fromInput =
			typeof input.workspacePath === 'string' && input.workspacePath.trim().length > 0
				? path.resolve(input.workspacePath)
				: undefined;
		if (fromInput) return fromInput;

		return typeof metadata?.workspacePath === 'string' && metadata.workspacePath.trim().length > 0
			? path.resolve(metadata.workspacePath)
			: undefined;
	}

	private getInitialThinkingLabel(
		def: AgentDefinition,
		prompt: string,
		providerId: string,
		modelName: string,
		apiKey: string,
		temperature: number,
		history: AgentHistoryMessage[],
		metadata?: Record<string, unknown>
	): string | undefined {
		if (!def.buildGraphInput || !def.extractThinkingLabel) {
			return undefined;
		}

		const initialState = def.buildGraphInput({
			prompt,
			apiKey,
			modelName,
			providerId,
			temperature,
			history,
			metadata,
		});

		return def.extractThinkingLabel(initialState)?.trim() || undefined;
	}

	private async loadHistory(
		input: AgentTaskInput,
		metadata?: Record<string, unknown>
	): Promise<AgentHistoryMessage[]> {
		const documentId =
			typeof metadata?.documentId === 'string' ? metadata.documentId.trim() : undefined;
		const chatId = typeof metadata?.chatId === 'string' ? metadata.chatId.trim() : undefined;
		const workspacePath = this.resolveWorkspacePath(input, metadata);

		if (!documentId || !chatId || !workspacePath) {
			return [];
		}

		let documentDir: string;
		try {
			documentDir = this.resolveDocumentDirectory(input, workspacePath, documentId);
		} catch (error) {
			this.logger?.warn(
				'AgentTaskHandler',
				`Skipping chat history for ${this.type}: ${error instanceof Error ? error.message : String(error)}`
			);
			return [];
		}

		const chatsDir = path.resolve(documentDir, 'chats');
		const sessionDir = path.resolve(chatsDir, chatId);
		if (!sessionDir.startsWith(`${chatsDir}${path.sep}`)) {
			this.logger?.warn(
				'AgentTaskHandler',
				`Rejected chat history path outside chats dir: ${chatId}`
			);
			return [];
		}

		try {
			const raw = await fs.readFile(path.join(sessionDir, 'messages.json'), 'utf-8');
			const parsed = JSON.parse(raw) as { messages?: unknown };
			return toAgentHistoryMessages(parsed.messages, input.prompt);
		} catch (error) {
			if ((error as NodeJS.ErrnoException | undefined)?.code !== 'ENOENT') {
				this.logger?.warn(
					'AgentTaskHandler',
					`Failed to load chat history for ${documentId}/${chatId}: ${error instanceof Error ? error.message : String(error)}`
				);
			}
			return [];
		}
	}

	private resolveDocumentDirectory(
		input: AgentTaskInput,
		workspacePath: string,
		documentId: string
	): string {
		const windowContext =
			typeof input.windowId === 'number'
				? this.windowContextManager.tryGet(input.windowId)
				: undefined;

		if (windowContext?.container.has('workspaceManager')) {
			return windowContext.container
				.get<Workspace>('workspaceManager')
				.getDocumentFolderPath(documentId);
		}

		if (!documentId || typeof documentId !== 'string') {
			throw new Error('Invalid document ID: must be a non-empty string');
		}

		const documentsRoot = path.resolve(workspacePath, 'output', 'documents');
		const documentDir = path.resolve(documentsRoot, documentId);
		if (!documentDir.startsWith(`${documentsRoot}${path.sep}`)) {
			throw new Error(`Rejected document path outside workspace for ID "${documentId}".`);
		}

		return documentDir;
	}

	private async loadDocumentModelId(
		input: AgentTaskInput,
		metadata?: Record<string, unknown>
	): Promise<string | undefined> {
		const documentId =
			typeof metadata?.documentId === 'string' ? metadata.documentId.trim() : undefined;
		if (!documentId) return undefined;

		const windowContext =
			typeof input.windowId === 'number'
				? this.windowContextManager.tryGet(input.windowId)
				: undefined;

		if (windowContext?.container.has('workspaceManager')) {
			try {
				const workspace = windowContext.container.get<Workspace>('workspaceManager');
				const config = await workspace.getDocumentConfig(documentId);
				return config.textModel || undefined;
			} catch {
				return undefined;
			}
		}

		const workspacePath = this.resolveWorkspacePath(input, metadata);
		if (!workspacePath) return undefined;

		const documentsRoot = path.resolve(workspacePath, 'output', 'documents');
		const configPath = path.resolve(documentsRoot, documentId, 'config.json');
		if (!configPath.startsWith(`${documentsRoot}${path.sep}`)) return undefined;

		try {
			const raw = await fs.readFile(configPath, 'utf-8');
			const config = JSON.parse(raw) as Record<string, unknown>;
			const value = config.defaultTextModelId;
			return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
		} catch {
			return undefined;
		}
	}
}

function toAgentHistoryMessages(messages: unknown, currentPrompt: string): AgentHistoryMessage[] {
	if (!Array.isArray(messages)) {
		return [];
	}

	const history: AgentHistoryMessage[] = [];

	for (const message of messages) {
		if (!message || typeof message !== 'object') {
			continue;
		}

		const entry = message as Record<string, unknown>;
		if (entry.role !== 'user' && entry.role !== 'assistant') {
			continue;
		}
		if (entry.status !== 'completed') {
			continue;
		}
		if (typeof entry.content !== 'string') {
			continue;
		}

		const content = entry.content.trim();
		if (!content) {
			continue;
		}

		history.push({ role: entry.role, content });
	}

	const trimmedPrompt = currentPrompt.trim();
	if (trimmedPrompt) {
		const lastMessage = history.at(-1);
		if (lastMessage?.role === 'user' && lastMessage.content === trimmedPrompt) {
			history.pop();
		}
	}

	return history;
}
