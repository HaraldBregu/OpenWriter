import path from 'node:path';
import type { TaskHandler, ProgressReporter, StreamReporter } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { StoreService } from '../../services/store';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace/workspace';
import { getTaskExecutionContext } from '../task-execution-context';
import { DEFAULT_IMAGE_MODEL_ID } from '../../../shared/models';

/**
 * AgentTaskHandler — bridges the task system to the agent registry.
 *
 * Submit a task with `type: 'agent'` and an input of the shape below.
 * The handler resolves the agent by `agentType`, enriches the input with
 * provider/model/apiKey from main-side services, resolves the document
 * file path from the caller window's Workspace facade, then executes
 * the agent's strategy. Renderer payloads never carry credentials or
 * filesystem paths.
 */

export interface AgentTaskInput<TAgentInput = unknown> {
	/** Registered agent type (e.g. 'assistant', 'rag', 'ocr'). */
	agentType: string;
	/** Input payload forwarded to the agent's `execute`, after enrichment. */
	input: TAgentInput;
}

export interface AgentTaskOutput<TAgentOutput = unknown> {
	agentType: string;
	output: TAgentOutput;
}

interface AgentInputRecord {
	providerId?: string;
	apiKey?: string;
	modelName?: string;
	imageProviderId?: string;
	imageApiKey?: string;
	imageModelName?: string;
	documentId?: string;
	documentPath?: string;
	workspacePath?: string;
	[key: string]: unknown;
}

export class AgentTaskHandler implements TaskHandler<AgentTaskInput, AgentTaskOutput> {
	readonly type = 'agent';

	constructor(
		private readonly agents: AgentRegistry,
		private readonly logger: LoggerService,
		private readonly serviceResolver: ServiceResolver,
		private readonly storeService: StoreService,
		private readonly modelResolver: ModelResolver,
		private readonly windowContextManager: WindowContextManager
	) {}

	validate(input: AgentTaskInput): void {
		if (!input?.agentType?.trim()) {
			throw new Error('agent task requires agentType');
		}
		if (!this.agents.has(input.agentType)) {
			throw new Error(`Unknown agent type: ${input.agentType}`);
		}
		if (input.input === undefined || input.input === null) {
			throw new Error('agent task requires input');
		}
	}

	async execute(
		input: AgentTaskInput,
		signal: AbortSignal,
		reporter: ProgressReporter,
		streamReporter?: StreamReporter,
		metadata?: Record<string, unknown>
	): Promise<AgentTaskOutput> {
		const agent = this.agents.get(input.agentType);
		const enrichedInput = await this.enrichInput(input.agentType, input.input, metadata);

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			progress: (percent, message) => reporter.progress(percent, message),
			stream: streamReporter ? (chunk) => streamReporter.stream(chunk) : undefined,
			metadata,
		};

		const output = await agent.execute(enrichedInput, ctx);
		return { agentType: input.agentType, output };
	}

	private async enrichInput<T>(
		agentType: string,
		raw: T,
		metadata?: Record<string, unknown>
	): Promise<T> {
		if (!raw || typeof raw !== 'object') return raw;

		const base = raw as AgentInputRecord;
		const agentSettings = this.storeService.getAgentById(agentType);
		const model = this.modelResolver.resolve({
			modelId: base.modelName?.trim() || agentSettings?.models.text,
		});
		const providerId = base.providerId?.trim() || model.providerId;
		const service = this.serviceResolver.resolve({ providerId });

		const enriched: AgentInputRecord = {
			...base,
			providerId: service.provider.id,
			apiKey: base.apiKey?.trim() || service.apiKey,
			modelName: model.modelId,
		};

		const imageCreds = this.resolveImageCredentials(base, agentSettings?.models.image);
		if (imageCreds) {
			enriched.imageProviderId = imageCreds.providerId;
			enriched.imageApiKey = imageCreds.apiKey;
			enriched.imageModelName = imageCreds.modelName;
		}

		const documentId = this.extractDocumentId(base, metadata);
		if (documentId) {
			enriched.documentId = documentId;
			const documentPath = this.resolveDocumentPath(documentId);
			if (documentPath) enriched.documentPath = documentPath;
		}

		const workspacePath = base.workspacePath?.trim() || this.resolveWorkspacePath();
		if (workspacePath) enriched.workspacePath = workspacePath;

		return enriched as unknown as T;
	}

	private resolveWorkspacePath(): string | undefined {
		const windowId = this.resolveWindowId();
		if (windowId === undefined) return undefined;
		const context = this.windowContextManager.tryGet(windowId);
		if (!context) return undefined;
		try {
			const workspace = context.container.get<Workspace>('workspaceManager');
			return workspace.getCurrent() ?? undefined;
		} catch (error) {
			this.logger.warn('AgentTaskHandler', 'Failed to resolve workspace path', error);
			return undefined;
		}
	}

	private resolveImageCredentials(
		base: AgentInputRecord,
		defaultImageModelId?: string
	): { providerId: string; apiKey: string; modelName: string } | undefined {
		try {
			const modelId = base.imageModelName?.trim() || defaultImageModelId || DEFAULT_IMAGE_MODEL_ID;
			const model = this.modelResolver.resolve({ modelId });
			const providerId = base.imageProviderId?.trim() || model.providerId;
			const service = this.serviceResolver.resolve({ providerId });
			return {
				providerId: service.provider.id,
				apiKey: base.imageApiKey?.trim() || service.apiKey,
				modelName: model.modelId,
			};
		} catch (error) {
			this.logger.warn(
				'AgentTaskHandler',
				'Image provider not configured; generate_image tool will be disabled',
				error
			);
			return undefined;
		}
	}

	private extractDocumentId(
		base: AgentInputRecord,
		metadata?: Record<string, unknown>
	): string | undefined {
		if (typeof base.documentId === 'string' && base.documentId) return base.documentId;
		const fromMeta = metadata?.documentId;
		return typeof fromMeta === 'string' && fromMeta ? fromMeta : undefined;
	}

	private resolveDocumentPath(documentId: string): string | undefined {
		const windowId = this.resolveWindowId();
		if (windowId === undefined) return undefined;

		const context = this.windowContextManager.tryGet(windowId);
		if (!context) return undefined;

		try {
			const workspace = context.container.get<Workspace>('workspaceManager');
			const folder = workspace.getDocumentFolderPath(documentId);
			return path.join(folder, 'content.md');
		} catch (error) {
			this.logger.warn(
				'AgentTaskHandler',
				`Failed to resolve document path for ${documentId}`,
				error
			);
			return undefined;
		}
	}

	private resolveWindowId(): number | undefined {
		const ctx = getTaskExecutionContext();
		return ctx?.windowId;
	}
}
