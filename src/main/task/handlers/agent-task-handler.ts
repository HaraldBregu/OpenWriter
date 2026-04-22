import path from 'node:path';
import type { TaskHandler, ProgressReporter, RecordEvent } from '../task-handler';
import type { AgentRegistry } from '../../agents/core/agent-registry';
import type { AgentContext, AgentEvent } from '../../agents/core/agent';
import type { LoggerService } from '../../services/logger';
import type { StoreService } from '../../services/store';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import type { WindowContextManager } from '../../core/window-context';
import type { Workspace } from '../../workspace/workspace';
import { getTaskExecutionContext } from '../task-execution-context';
import { DEFAULT_IMAGE_MODEL_ID } from '../../../shared/models';
import type { SkillsStoreService } from '../../services/skills-store-service';
import type { Skill } from '../../agents/skills';
import { DocumentStreamWriter } from './document-stream-writer';

/**
 * AgentTaskHandler — bridges the task system to the agent registry.
 *
 * Submit a task with `type: 'agent'` and an input of the shape below. The
 * handler resolves the agent by `agentType`, enriches the input with
 * provider/model/apiKey from main-side services, resolves the document
 * file path from the caller window's Workspace facade, then executes the
 * agent's strategy. Renderer payloads never carry credentials or
 * filesystem paths.
 *
 * While the agent runs, it emits typed `AgentEvent`s through `ctx.onEvent`.
 * The handler:
 *   - appends `text` deltas to `content.md` on disk;
 *   - drives task progress (0% during reasoning events, token-count ramp
 *     during `text` events, 100% on completion);
 *   - forwards every event to the task's `recordEvent` sink, which
 *     persists it on `ActiveTask.events` and broadcasts it to the
 *     renderer as a `task:event` payload.
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

const LOG_SOURCE = 'AgentTaskHandler';
const PROGRESS_RAMP_K = 0.5;
const PROGRESS_RAMP_CAP = 99;

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
	skills?: Skill[];
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
		private readonly windowContextManager: WindowContextManager,
		private readonly skillsStoreService?: SkillsStoreService
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
		metadata?: Record<string, unknown>,
		recordEvent?: RecordEvent
	): Promise<AgentTaskOutput> {
		const agent = this.agents.get(input.agentType);
		const startedAt = Date.now();
		const enrichedInput = await this.enrichInput(input.agentType, input.input, metadata);
		const record = (enrichedInput ?? {}) as AgentInputRecord;

		this.logTaskStart(input.agentType, enrichedInput, metadata);

		const writer = await this.initDocumentWriter(record.documentPath);
		let tokens = 0;

		reporter.progress(0, 'reasoning');

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			metadata,
			progress: (percent, message) => {
				reporter.progress(percent, message);
			},
			onEvent: (event: AgentEvent) => {
				if (event.kind === 'text') {
					const delta = extractTextDelta(event.payload);
					if (delta) {
						writer?.appendDelta(delta);
						tokens += 1;
						reporter.progress(rampPct(tokens), 'response');
					}
				} else {
					reporter.progress(0, 'reasoning');
				}
				recordEvent?.(event);
			},
		};

		try {
			const output = await agent.execute(enrichedInput, ctx);
			await writer?.end();
			reporter.progress(100, 'done');
			this.logger.info(LOG_SOURCE, `[${input.agentType}] completed`, {
				elapsedMs: Date.now() - startedAt,
				tokens,
				output: summarizeOutput(output),
			});
			return { agentType: input.agentType, output };
		} catch (error) {
			await writer?.end();
			const err = error instanceof Error ? error : new Error(String(error));
			const level = err.name === 'AbortError' ? 'warn' : 'error';
			this.logger[level](LOG_SOURCE, `[${input.agentType}] failed`, {
				elapsedMs: Date.now() - startedAt,
				error: err.message,
				name: err.name,
			});
			throw error;
		}
	}

	private async initDocumentWriter(
		documentPath: string | undefined
	): Promise<DocumentStreamWriter | undefined> {
		if (!documentPath) return undefined;
		const writer = new DocumentStreamWriter(documentPath, this.logger);
		try {
			await writer.begin();
			return writer;
		} catch (error) {
			this.logger.warn(LOG_SOURCE, `Failed to open document stream for ${documentPath}`, error);
			return undefined;
		}
	}

	private logTaskStart(
		agentType: string,
		enriched: unknown,
		metadata?: Record<string, unknown>
	): void {
		const record = (enriched ?? {}) as AgentInputRecord;
		this.logger.info(LOG_SOURCE, `[${agentType}] started`, {
			providerId: record.providerId,
			modelName: record.modelName,
			imageProviderId: record.imageProviderId,
			imageModelName: record.imageModelName,
			documentId: record.documentId,
			hasWorkspacePath: Boolean(record.workspacePath),
			skillsCount: record.skills?.length ?? 0,
			metadataKeys: metadata ? Object.keys(metadata) : [],
		});
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

		if (agentType === 'assistant' && !base.skills) {
			const skills = await this.loadSkills();
			if (skills.length > 0) enriched.skills = skills;
		}

		return enriched as unknown as T;
	}

	private async loadSkills(): Promise<Skill[]> {
		if (!this.skillsStoreService) return [];
		try {
			return await this.skillsStoreService.listSkillEntities();
		} catch (error) {
			this.logger.warn('AgentTaskHandler', 'Failed to load skills', error);
			return [];
		}
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

function summarizeOutput(output: unknown): Record<string, unknown> {
	if (!output || typeof output !== 'object') {
		return { type: typeof output };
	}
	const record = output as Record<string, unknown>;
	const summary: Record<string, unknown> = {};
	if (typeof record.content === 'string') summary.contentLength = record.content.length;
	if (typeof record.iterations === 'number') summary.iterations = record.iterations;
	if (typeof record.stoppedReason === 'string') summary.stoppedReason = record.stoppedReason;
	if (Array.isArray(record.toolCalls)) summary.toolCalls = record.toolCalls.length;
	const usage = record.usage;
	if (usage && typeof usage === 'object') {
		summary.usage = usage;
	}
	return summary;
}

function extractTextDelta(payload: unknown): string {
	if (!payload || typeof payload !== 'object') return '';
	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? text : '';
}

function rampPct(tokens: number): number {
	return Math.min(PROGRESS_RAMP_CAP, Math.round(tokens * PROGRESS_RAMP_K));
}
