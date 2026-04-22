import { mkdir as fsMkdir, open as fsOpen, type FileHandle } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LoggerService } from '../../services/logger';
import { withFileMutationQueue } from '../../agents/tools/file-mutation-queue';

const LOG_SOURCE = 'DocumentStreamWriter';

/**
 * Streams content to a markdown document on disk.
 *
 * Lifecycle:
 *   1. `begin()` — creates parent dirs and truncates the file to empty.
 *   2. `appendDelta(delta)` — appends one token/chunk. Calls are serialized.
 *   3. `end()` — flushes and closes the underlying FileHandle. Idempotent.
 *
 * Concurrent runs targeting the same file are serialized via
 * `withFileMutationQueue`, so multiple tasks cannot interleave bytes.
 */
export class DocumentStreamWriter {
	private handle: FileHandle | undefined;
	private chain: Promise<void> = Promise.resolve();
	private closed = false;

	constructor(
		private readonly filePath: string,
		private readonly logger: LoggerService
	) {}

	async begin(): Promise<void> {
		if (this.handle) {
			throw new Error('DocumentStreamWriter.begin called twice');
		}
		await withFileMutationQueue(this.filePath, async () => {
			await fsMkdir(dirname(this.filePath), { recursive: true });
			this.handle = await fsOpen(this.filePath, 'w');
		});
	}

	async appendDelta(delta: string): Promise<void> {
		if (this.closed) return;
		if (!this.handle) {
			throw new Error('DocumentStreamWriter.appendDelta before begin');
		}
		if (!delta) return;
		const handle = this.handle;
		this.chain = this.chain.then(() => handle.write(delta).then(() => undefined));
		await this.chain;
	}

	async end(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		try {
			await this.chain;
		} catch (error) {
			this.logger.warn(LOG_SOURCE, `Pending write failed for ${this.filePath}`, error);
		}
		const handle = this.handle;
		this.handle = undefined;
		if (!handle) return;
		try {
			await handle.close();
		} catch (error) {
			this.logger.warn(LOG_SOURCE, `Failed to close ${this.filePath}`, error);
		}
	}
}
