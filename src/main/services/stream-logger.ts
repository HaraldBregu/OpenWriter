import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { Disposable } from '../core/service-container';
import type { AgentEvent } from '../agents/core/agent';
import type { LoggerService } from './logger';

export type StreamType = 'text-generation' | 'image-generation';

export interface StreamOpenOptions {
	streamType: StreamType;
	agentType: string;
	metadata?: Record<string, unknown>;
}

export interface StreamCloseOutcome {
	status: 'completed' | 'error' | 'cancelled';
	error?: string;
	stoppedReason?: string;
	tokens?: number;
	contentLength?: number;
}

interface StreamRecord {
	filePath: string;
	startedAt: number;
	streamType: StreamType;
	agentType: string;
	eventCount: number;
}

const LOG_SOURCE = 'StreamLogger';
const DEFAULT_RETENTION_DAYS = 7;

/**
 * StreamLoggerService — per-task stream log for agent runs.
 *
 * Writes a JSONL file per task under `userData/stream-logs/<taskId>.jsonl`,
 * recording every agent stream event (delta tokens, phase changes, tool calls,
 * ...). Streams are tagged with a `streamType` discriminator (currently
 * `text-generation` or `image-generation`) so consumers can filter runs by
 * modality when debugging.
 *
 * Writes are synchronous (append-per-event) to guarantee durability if the
 * process crashes mid-stream.
 */
export class StreamLoggerService implements Disposable {
	private baseDir: string | null = null;
	private readonly streams = new Map<string, StreamRecord>();
	private readonly retentionDays: number;

	constructor(
		private readonly logger: LoggerService,
		options: { retentionDays?: number } = {}
	) {
		this.retentionDays = options.retentionDays ?? DEFAULT_RETENTION_DAYS;
		this.initialize();
	}

	private initialize(): void {
		try {
			this.baseDir = path.join(app.getPath('userData'), 'stream-logs');
			fs.mkdirSync(this.baseDir, { recursive: true });
			this.cleanupOld();
			this.logger.info(LOG_SOURCE, 'StreamLogger initialized', {
				directory: this.baseDir,
				retentionDays: this.retentionDays,
			});
		} catch (error) {
			this.logger.error(LOG_SOURCE, 'Failed to initialize', {
				error: error instanceof Error ? error.message : String(error),
			});
			this.baseDir = null;
		}
	}

	/**
	 * Open a new stream log for a task. No-op if already open.
	 */
	open(taskId: string, opts: StreamOpenOptions): void {
		if (!this.baseDir || !taskId) return;
		if (this.streams.has(taskId)) return;

		const filePath = path.join(this.baseDir, `${taskId}.jsonl`);
		const record: StreamRecord = {
			filePath,
			startedAt: Date.now(),
			streamType: opts.streamType,
			agentType: opts.agentType,
			eventCount: 0,
		};
		this.streams.set(taskId, record);

		this.writeLine(record, {
			kind: 'stream:open',
			at: record.startedAt,
			taskId,
			streamType: opts.streamType,
			agentType: opts.agentType,
			metadata: opts.metadata,
		});
	}

	/**
	 * Append an agent event to the open stream for the given task. No-op if
	 * no stream is open for that task.
	 */
	logEvent(taskId: string, event: AgentEvent): void {
		const record = this.streams.get(taskId);
		if (!record) return;
		record.eventCount += 1;
		this.writeLine(record, {
			kind: 'stream:event',
			at: event.at ?? Date.now(),
			eventKind: event.kind,
			payload: event.payload,
		});
	}

	/**
	 * Close the stream for a task, writing a summary line. No-op if already
	 * closed or never opened.
	 */
	close(taskId: string, outcome: StreamCloseOutcome): void {
		const record = this.streams.get(taskId);
		if (!record) return;
		const closedAt = Date.now();
		this.writeLine(record, {
			kind: 'stream:close',
			at: closedAt,
			elapsedMs: closedAt - record.startedAt,
			eventCount: record.eventCount,
			status: outcome.status,
			error: outcome.error,
			stoppedReason: outcome.stoppedReason,
			tokens: outcome.tokens,
			contentLength: outcome.contentLength,
		});
		this.streams.delete(taskId);
	}

	getDirectory(): string | null {
		return this.baseDir;
	}

	getStreamFile(taskId: string): string | null {
		return this.streams.get(taskId)?.filePath ?? null;
	}

	destroy(): void {
		for (const taskId of Array.from(this.streams.keys())) {
			this.close(taskId, { status: 'cancelled', error: 'service shutdown' });
		}
	}

	private writeLine(record: StreamRecord, payload: unknown): void {
		try {
			fs.appendFileSync(record.filePath, JSON.stringify(payload) + '\n', 'utf-8');
		} catch (error) {
			this.logger.warn(LOG_SOURCE, `Failed to write stream log: ${record.filePath}`, {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private cleanupOld(): void {
		if (!this.baseDir || this.retentionDays <= 0) return;
		try {
			const maxAgeMs = this.retentionDays * 24 * 60 * 60 * 1000;
			const now = Date.now();
			let deleted = 0;
			for (const name of fs.readdirSync(this.baseDir)) {
				if (!name.endsWith('.jsonl')) continue;
				const filePath = path.join(this.baseDir, name);
				const stat = fs.statSync(filePath);
				if (now - stat.mtimeMs > maxAgeMs) {
					fs.unlinkSync(filePath);
					deleted += 1;
				}
			}
			if (deleted > 0) {
				this.logger.debug(LOG_SOURCE, `Cleaned up ${deleted} old stream log(s)`);
			}
		} catch (error) {
			this.logger.warn(LOG_SOURCE, 'Cleanup failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
