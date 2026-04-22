import path from 'node:path';
import type {
	TaskHandler,
	ProgressReporter,
	StreamReporter,
	TaskStateWriter,
} from '../task-handler';
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
import type { SkillsStoreService } from '../../services/skills-store-service';
import type { Skill } from '../../agents/skills';
import { DocumentStreamWriter } from './document-stream-writer';

/**
 * AgentTaskHandler — bridges the task system to the agent registry.
 *
 * Submit a task with `type: 'agent'` and an input of the shape below.
 * The handler resolves the agent by `agentType`, enriches the input with
 * provider/model/apiKey from main-side services, resolves the document
 * file path from the caller window's Workspace facade, then executes
 * the agent's strategy. Renderer payloads never carry credentials or
 * filesystem paths.
 *
 * While the agent runs, the handler classifies each stream event as
 * either `reasoning` (controller decisions, skill selections, step
 * boundaries) or `response` (generated text). Reasoning events keep
 * progress at 0 and are stored on the task as `reasoningLog`. Response
 * events append text deltas to the document file (`content.md`) and to
 * the task's `streamedContent` buffer, and advance progress via a token
 * count ramp.
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

interface StreamEvent {
	kind?: string;
	payload?: unknown;
	at?: number;
}

const LOG_SOURCE = 'AgentTaskHandler';
const STREAM_PREVIEW_CHARS = 160;
const PROGRESS_RAMP_K = 0.5;
const PROGRESS_RAMP_CAP = 99;
const REASONING_KINDS = new Set([
	'decision',
	'decision:invalid',
	'skill:selected',
	'step:begin',
	'step:end',
]);

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
		streamReporter?: StreamReporter,
		metadata?: Record<string, unknown>,
		stateWriter?: TaskStateWriter
	): Promise<AgentTaskOutput> {
		const agent = this.agents.get(input.agentType);
		const startedAt = Date.now();
		const enrichedInput = await this.enrichInput(input.agentType, input.input, metadata);
		const record = (enrichedInput ?? {}) as AgentInputRecord;

		this.logTaskStart(input.agentType, enrichedInput, metadata);

		const writer = await this.initDocumentWriter(record.documentPath);
		const progressState = { tokens: 0 };

		reporter.progress(0, 'reasoning');

		const ctx: AgentContext = {
			signal,
			logger: this.logger,
			// Agent-reported progress is ignored — the handler drives task
			// progress via reasoning/response dispatch below.
			progress: (percent, message) => {
				this.logger.debug(LOG_SOURCE, `[${input.agentType}] agent-progress ${percent}%`, {
					message,
				});
			},
			stream: (chunk) => {
				this.dispatchStreamChunk(input.agentType, chunk, {
					writer,
					reporter,
					stateWriter,
					streamReporter,
					progressState,
				});
			},
			metadata,
		};

		try {
			const output = await agent.execute(enrichedInput, ctx);
			await writer?.end();
			reporter.progress(100, 'done');
			this.logger.info(LOG_SOURCE, `[${input.agentType}] completed`, {
				elapsedMs: Date.now() - startedAt,
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

	private dispatchStreamChunk(
		agentType: string,
		chunk: string,
		deps: {
			writer: DocumentStreamWriter | undefined;
			reporter: ProgressReporter;
			stateWriter: TaskStateWriter | undefined;
			streamReporter: StreamReporter | undefined;
			progressState: { tokens: number };
		}
	): void {
		const event = tryParseEvent(chunk);
		if (event?.kind) {
			if (REASONING_KINDS.has(event.kind)) {
				this.handleReasoning(agentType, event, deps);
			} else if (event.kind === 'text') {
				this.handleResponse(agentType, event, deps);
			} else {
				this.logAgentEvent(agentType, event);
			}
		} else {
			this.logStreamChunk(agentType, chunk);
		}

		deps.streamReporter?.stream(chunk);
	}

	private handleReasoning(
		agentType: string,
		event: StreamEvent,
		deps: { reporter: ProgressReporter; stateWriter: TaskStateWriter | undefined }
	): void {
		deps.stateWriter?.pushReasoning({
			at: event.at ?? Date.now(),
			kind: event.kind ?? 'unknown',
			payload: event.payload,
		});
		deps.reporter.progress(0, 'reasoning');
		this.logAgentEvent(agentType, event);
	}

	private handleResponse(
		agentType: string,
		event: StreamEvent,
		deps: {
			writer: DocumentStreamWriter | undefined;
			reporter: ProgressReporter;
			stateWriter: TaskStateWriter | undefined;
			progressState: { tokens: number };
		}
	): void {
		const delta = extractTextDelta(event.payload);
		if (!delta) {
			this.logAgentEvent(agentType, event);
			return;
		}
		deps.writer?.appendDelta(delta);
		deps.stateWriter?.appendResponseDelta(delta);
		deps.progressState.tokens += 1;
		deps.stateWriter?.setTokenCount(deps.progressState.tokens);
		deps.reporter.progress(rampPct(deps.progressState.tokens), 'response');
		this.logAgentEvent(agentType, event);
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

	private logStreamChunk(agentType: string, chunk: string): void {
		const trimmed = chunk.trim();
		if (!trimmed) return;
		this.logger.debug(LOG_SOURCE, `[${agentType}] stream`, {
			preview: trimmed.slice(0, STREAM_PREVIEW_CHARS),
		});
	}

	private logAgentEvent(agentType: string, event: StreamEvent): void {
		const tag = `[${agentType}] ${event.kind ?? 'event'}`;
		switch (event.kind) {
			case 'status':
				this.logger.info(LOG_SOURCE, tag, event.payload);
				return;
			case 'decision':
			case 'skill:selected':
				this.logger.info(LOG_SOURCE, tag, event.payload);
				return;
			case 'decision:invalid':
			case 'budget':
				this.logger.warn(LOG_SOURCE, tag, event.payload);
				return;
			case 'tool':
			case 'text':
			case 'image':
			case 'usage':
			case 'step:begin':
			case 'step:end':
				this.logger.debug(LOG_SOURCE, tag, event.payload);
				return;
			default:
				this.logger.debug(LOG_SOURCE, tag, event.payload);
		}
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

function tryParseEvent(chunk: string): StreamEvent | undefined {
	const trimmed = chunk.trim();
	if (!trimmed) return undefined;
	try {
		return JSON.parse(trimmed) as StreamEvent;
	} catch {
		return undefined;
	}
}

function extractTextDelta(payload: unknown): string {
	if (!payload || typeof payload !== 'object') return '';
	const text = (payload as { text?: unknown }).text;
	return typeof text === 'string' ? text : '';
}

function rampPct(tokens: number): number {
	return Math.min(PROGRESS_RAMP_CAP, Math.round(tokens * PROGRESS_RAMP_K));
}
