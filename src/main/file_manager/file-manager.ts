import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LoggerService } from '../services/logger';
import type {
	FileEncoding,
	ReadFileOptions,
	WriteFileOptions,
	CreateFileOptions,
	CreateFolderOptions,
	RenameOptions,
	RenameResult,
} from './types';
import { MAX_READ_SIZE_BYTES } from './constants';
import { asErrno } from './errors';
import { assertPathSafe, assertValidName, assertValidEncoding } from './validators';

// ---------------------------------------------------------------------------
// FileManager
// ---------------------------------------------------------------------------

/**
 * FileManager provides a security-aware, production-grade abstraction
 * over Node.js filesystem primitives for the Electron main process.
 *
 * ### Security model
 * Every path argument is validated against **two** allowlists before any I/O
 * is performed:
 *
 * 1. **Static Electron paths** (Documents, Downloads, Desktop, userData)
 *    managed by {@link PathValidator}.
 * 2. **Extra trusted roots** supplied at construction time — typically the
 *    active workspace path, injected by the IPC layer so this class does not
 *    need a direct reference to `WorkspaceService`.
 *
 * Any path that does not fall inside at least one allowlist entry is rejected
 * with a descriptive `Error` before any filesystem call is made. This prevents
 * path-traversal attacks even if an attacker manages to forge an IPC message.
 *
 * ### Atomicity
 * {@link writeFile} defaults to an atomic write strategy: content is written to
 * a `.tmp` sibling file first and then renamed into place. A crash or power
 * loss during the write therefore never leaves the target in a corrupted state.
 *
 * ### Async-only
 * All methods use `fs/promises` exclusively. Synchronous filesystem calls block
 * the main-process event loop and are never used here.
 *
 * ### Supported operations
 * - {@link readFile}    — Read a file's content as a string (with size cap)
 * - {@link writeFile}   — Write (or overwrite) a file atomically
 * - {@link createFile}  — Create a new file, optionally with initial content
 * - {@link createFolder} — Create a directory, optionally recursive
 * - {@link renameEntry} — Rename or move a file or directory
 */
export class FileManager {
	private static readonly LOG_SOURCE = 'FileManager';

	/** Resolved absolute roots accepted in addition to the PathValidator set. */
	private readonly extraRoots: readonly string[];

	constructor(
		private readonly logger?: LoggerService,
		/**
		 * Additional absolute root directories to trust beyond the four standard
		 * Electron paths. Pass the current workspace path here so that workspace
		 * files can be read and written without disabling `PathValidator`.
		 *
		 * Paths are resolved and normalised at construction time.
		 */
		extraAllowedRoots: string[] = []
	) {
		this.extraRoots = extraAllowedRoots.map((r) => path.resolve(r));
	}

	// -------------------------------------------------------------------------
	// Read
	// -------------------------------------------------------------------------

	/**
	 * Read a file and return its content as a string.
	 *
	 * Files larger than `MAX_READ_SIZE_BYTES` (64 MB) are rejected before any
	 * buffer is allocated to avoid exhausting the renderer's V8 heap.
	 *
	 * @param filePath - Absolute path to the file.
	 * @param options  - Optional encoding (defaults to `'utf-8'`).
	 * @returns The file content as a decoded string.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If the file does not exist (`ENOENT`).
	 * @throws {Error} If the file exceeds the size cap.
	 * @throws {Error} If the process lacks read permission (`EACCES`).
	 * @throws {Error} If the path refers to a directory (`EISDIR`).
	 */
	async readFile(filePath: string, options: ReadFileOptions = {}): Promise<string> {
		const { encoding = 'utf-8' } = options;
		assertValidEncoding(encoding);
		const resolved = assertPathSafe(filePath, this.extraRoots);

		let stats: Awaited<ReturnType<typeof fs.stat>>;
		try {
			stats = await fs.stat(resolved);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'ENOENT') throw new Error(`File not found: ${resolved}`);
			throw new Error(`Cannot stat "${resolved}": ${error.message}`);
		}

		if (stats.isDirectory()) {
			throw new Error(`Path is a directory, not a file: ${resolved}`);
		}
		if (stats.size > MAX_READ_SIZE_BYTES) {
			throw new Error(
				`File size ${stats.size} bytes exceeds the ${MAX_READ_SIZE_BYTES}-byte read limit: "${resolved}"`
			);
		}

		this.logger?.debug(
			FileManager.LOG_SOURCE,
			`readFile: ${resolved} (${stats.size} bytes, encoding: ${encoding})`
		);

		try {
			const content = await fs.readFile(resolved, encoding);
			return content;
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'ENOENT') throw new Error(`File not found: ${resolved}`);
			if (error.code === 'EACCES') throw new Error(`Permission denied reading file: ${resolved}`);
			if (error.code === 'EISDIR') throw new Error(`Path is a directory, not a file: ${resolved}`);
			throw new Error(`Failed to read file "${resolved}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Write
	// -------------------------------------------------------------------------

	/**
	 * Write content to a file, creating it if it does not exist or overwriting
	 * it if it does.
	 *
	 * By default the write is **atomic**: content is first written to a
	 * temporary `.tmp` sibling in the same directory and then renamed into
	 * place. This guarantees the target file is never left in a half-written
	 * state if the process crashes mid-operation.
	 *
	 * @param filePath - Absolute path of the destination file.
	 * @param content  - String content to write.
	 * @param options  - Encoding, atomicity, and parent-creation options.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If the parent directory does not exist (and `createParents` is false).
	 * @throws {Error} If the process lacks write permission.
	 * @throws {Error} If any other I/O error occurs.
	 */
	async writeFile(
		filePath: string,
		content: string,
		options: WriteFileOptions = {}
	): Promise<void> {
		const { encoding = 'utf-8', atomic = true, createParents = false } = options;
		assertValidEncoding(encoding);
		const resolved = assertPathSafe(filePath, this.extraRoots);

		if (createParents) {
			await this.ensureParentDirectory(resolved);
		}

		this.logger?.debug(
			FileManager.LOG_SOURCE,
			`writeFile: ${resolved} (atomic: ${atomic}, encoding: ${encoding})`
		);

		if (atomic) {
			await this.writeFileAtomic(resolved, content, encoding);
		} else {
			try {
				await fs.writeFile(resolved, content, encoding);
			} catch (err) {
				throw this.wrapWriteError(err, resolved);
			}
		}

		this.logger?.debug(
			FileManager.LOG_SOURCE,
			`writeFile complete: ${resolved} (${Buffer.byteLength(content, encoding)} bytes)`
		);
	}

	// -------------------------------------------------------------------------
	// Create file
	// -------------------------------------------------------------------------

	/**
	 * Create a new file at `filePath`.
	 *
	 * Unlike {@link writeFile}, this operation is intended for initial creation.
	 * By default it silently succeeds if the file already exists (idempotent).
	 * Pass `failIfExists: true` to make the operation exclusive (`O_CREAT|O_EXCL`).
	 *
	 * @param filePath - Absolute path of the file to create.
	 * @param options  - Initial content, encoding, existence policy, and parent creation.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If `failIfExists` is `true` and the file already exists.
	 * @throws {Error} If the parent directory does not exist (and `createParents` is false).
	 * @throws {Error} If the process lacks write permission.
	 */
	async createFile(filePath: string, options: CreateFileOptions = {}): Promise<void> {
		const {
			content = '',
			encoding = 'utf-8',
			failIfExists = false,
			createParents = false,
		} = options;
		assertValidEncoding(encoding);
		const resolved = assertPathSafe(filePath, this.extraRoots);
		assertValidName(path.basename(resolved));

		if (createParents) {
			await this.ensureParentDirectory(resolved);
		}

		this.logger?.debug(FileManager.LOG_SOURCE, `createFile: ${resolved}`);

		try {
			await fs.writeFile(resolved, content, { encoding, flag: 'wx' });
			this.logger?.debug(FileManager.LOG_SOURCE, `createFile success: ${resolved}`);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EEXIST') {
				if (failIfExists) {
					throw new Error(`File already exists: ${resolved}`);
				}
				this.logger?.debug(
					FileManager.LOG_SOURCE,
					`createFile: file already exists, skipping: ${resolved}`
				);
				return;
			}
			if (error.code === 'ENOENT') {
				throw new Error(
					`Parent directory does not exist for "${resolved}". ` +
						'Pass createParents: true or create the parent first with createFolder().'
				);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied creating file: ${resolved}`);
			}
			throw new Error(`Failed to create file "${resolved}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Create folder
	// -------------------------------------------------------------------------

	/**
	 * Create a directory at `folderPath`.
	 *
	 * By default this behaves like `mkdir -p` (recursive, idempotent). Pass
	 * `failIfExists: true` to enforce exclusive creation, or `recursive: false`
	 * to require the parent to already exist.
	 *
	 * @param folderPath - Absolute path of the directory to create.
	 * @param options    - Recursive and existence policy options.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If `failIfExists` is `true` and the directory already exists.
	 * @throws {Error} If `recursive` is `false` and the parent does not exist.
	 * @throws {Error} If the process lacks write permission.
	 */
	async createFolder(folderPath: string, options: CreateFolderOptions = {}): Promise<void> {
		const { recursive = true, failIfExists = false } = options;
		const resolved = assertPathSafe(folderPath, this.extraRoots);
		assertValidName(path.basename(resolved));

		this.logger?.debug(
			FileManager.LOG_SOURCE,
			`createFolder: ${resolved} (recursive: ${recursive})`
		);

		try {
			await fs.mkdir(resolved, { recursive });
			this.logger?.debug(FileManager.LOG_SOURCE, `createFolder success: ${resolved}`);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EEXIST') {
				if (failIfExists) {
					throw new Error(`Folder already exists: ${resolved}`);
				}
				this.logger?.debug(
					FileManager.LOG_SOURCE,
					`createFolder: directory already exists, skipping: ${resolved}`
				);
				return;
			}
			if (error.code === 'ENOENT') {
				throw new Error(
					`Parent directory does not exist for "${resolved}". ` +
						'Pass recursive: true or create the parent first with createFolder().'
				);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied creating folder: ${resolved}`);
			}
			throw new Error(`Failed to create folder "${resolved}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Rename / move
	// -------------------------------------------------------------------------

	/**
	 * Rename or move a file or directory from `oldPath` to `newPath`.
	 *
	 * Both paths must be within the allowed directories. The destination's parent
	 * directory must already exist — this method does **not** create intermediate
	 * directories automatically, to keep rename semantics predictable.
	 *
	 * @param oldPath - Current absolute path of the file or directory.
	 * @param newPath - Desired absolute destination path.
	 * @param options - Existence policy at the destination.
	 * @returns An object containing the resolved `newPath`.
	 *
	 * @throws {Error} If either path is outside allowed directories.
	 * @throws {Error} If `oldPath` does not exist.
	 * @throws {Error} If `failIfExists` is `true` and `newPath` already exists (default).
	 * @throws {Error} If the destination's parent directory does not exist.
	 * @throws {Error} If the rename crosses filesystem boundaries (`EXDEV`).
	 * @throws {Error} If the process lacks the necessary permissions.
	 */
	async renameEntry(
		oldPath: string,
		newPath: string,
		options: RenameOptions = {}
	): Promise<RenameResult> {
		const { failIfExists = true } = options;

		const resolvedOld = assertPathSafe(oldPath, this.extraRoots);
		const resolvedNew = assertPathSafe(newPath, this.extraRoots);
		assertValidName(path.basename(resolvedNew));

		this.logger?.debug(FileManager.LOG_SOURCE, `renameEntry: "${resolvedOld}" -> "${resolvedNew}"`);

		try {
			await fs.access(resolvedOld);
		} catch {
			throw new Error(`Source path does not exist: ${resolvedOld}`);
		}

		if (failIfExists) {
			let destExists = false;
			try {
				await fs.access(resolvedNew);
				destExists = true;
			} catch {
				// ENOENT — destination is free, continue.
			}
			if (destExists) {
				throw new Error(`Destination already exists: ${resolvedNew}`);
			}
		}

		const newParent = path.dirname(resolvedNew);
		try {
			await fs.access(newParent);
		} catch {
			throw new Error(
				`Destination parent directory does not exist: "${newParent}". ` +
					'Create it first with createFolder().'
			);
		}

		try {
			await fs.rename(resolvedOld, resolvedNew);
			this.logger?.debug(
				FileManager.LOG_SOURCE,
				`renameEntry success: "${resolvedOld}" -> "${resolvedNew}"`
			);
			return { newPath: resolvedNew };
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'ENOENT') {
				throw new Error(`Source path does not exist: ${resolvedOld}`);
			}
			if (error.code === 'EACCES' || error.code === 'EPERM') {
				throw new Error(`Permission denied renaming "${resolvedOld}" to "${resolvedNew}"`);
			}
			if (error.code === 'EXDEV') {
				throw new Error(
					`Cannot rename across filesystem boundaries: ` +
						`"${resolvedOld}" -> "${resolvedNew}". ` +
						'Use a copy-then-delete approach for cross-volume moves.'
				);
			}
			if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
				throw new Error(`Destination already exists and is not empty: ${resolvedNew}`);
			}
			throw new Error(`Failed to rename "${resolvedOld}" to "${resolvedNew}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Private filesystem helpers
	// -------------------------------------------------------------------------

	/**
	 * Create the parent directory of `filePath` if it does not already exist.
	 * Uses `recursive: true` so intermediate ancestors are created too.
	 */
	private async ensureParentDirectory(filePath: string): Promise<void> {
		const dir = path.dirname(filePath);
		try {
			await fs.mkdir(dir, { recursive: true });
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied creating parent directory "${dir}" for "${filePath}"`);
			}
			throw new Error(`Failed to create parent directory "${dir}": ${error.message}`);
		}
	}

	/**
	 * Write `content` to `filePath` atomically via a temporary sibling file.
	 *
	 * Steps:
	 *   1. Write to `.<basename>.<uuid>.tmp` in the same directory.
	 *   2. `fs.rename` the `.tmp` file over `filePath` (atomic on the same volume).
	 *   3. On failure, attempt best-effort cleanup of the `.tmp` file.
	 */
	private async writeFileAtomic(
		filePath: string,
		content: string,
		encoding: FileEncoding
	): Promise<void> {
		const dir = path.dirname(filePath);
		const tmpPath = path.join(dir, `.${path.basename(filePath)}.${randomUUID()}.tmp`);

		try {
			await fs.writeFile(tmpPath, content, encoding);
			await fs.rename(tmpPath, filePath);
		} catch (err) {
			await fs.unlink(tmpPath).catch(() => {});
			throw this.wrapWriteError(err, filePath);
		}
	}

	/** Convert a raw I/O error from a write operation into a descriptive Error. */
	private wrapWriteError(err: unknown, filePath: string): Error {
		const error = asErrno(err);
		if (error.code === 'ENOENT') {
			return new Error(
				`Parent directory does not exist for "${filePath}". ` +
					'Pass createParents: true or create the parent first with createFolder().'
			);
		}
		if (error.code === 'EACCES') {
			return new Error(`Permission denied writing file: ${filePath}`);
		}
		if (error.code === 'EISDIR') {
			return new Error(`Path is a directory, not a file: ${filePath}`);
		}
		if (error.code === 'ENOSPC') {
			return new Error(`No space left on device while writing "${filePath}"`);
		}
		return new Error(`Failed to write file "${filePath}": ${(err as Error).message}`);
	}
}
