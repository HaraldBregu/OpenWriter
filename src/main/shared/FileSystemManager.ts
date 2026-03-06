import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PathValidator } from './PathValidator';
import type { LoggerService } from '../services/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Encoding options accepted by read and write operations.
 * Keeping this as a named type makes call-sites self-documenting.
 */
export type FileEncoding = 'utf-8' | 'utf8' | 'ascii' | 'latin1' | 'base64' | 'hex';

/**
 * Options for {@link FileSystemManager.readFile}.
 */
export interface ReadFileOptions {
	/** Character encoding. Defaults to `'utf-8'`. */
	encoding?: FileEncoding;
}

/**
 * Options for {@link FileSystemManager.writeFile}.
 */
export interface WriteFileOptions {
	/** Character encoding. Defaults to `'utf-8'`. */
	encoding?: FileEncoding;
	/**
	 * When `true` (default), the content is written to a temporary sibling
	 * file first and then atomically renamed into place. This prevents
	 * half-written files if the process crashes mid-write.
	 *
	 * Set to `false` only when the destination file system does not support
	 * rename across the same directory (e.g. certain network mounts).
	 */
	atomic?: boolean;
}

/**
 * Options for {@link FileSystemManager.createFile}.
 */
export interface CreateFileOptions {
	/** Initial content for the new file. Defaults to an empty string. */
	content?: string;
	/** Character encoding for the initial content. Defaults to `'utf-8'`. */
	encoding?: FileEncoding;
	/**
	 * When `true`, throws if the file already exists.
	 * When `false` (default), silently succeeds if the file is already present.
	 */
	failIfExists?: boolean;
}

/**
 * Options for {@link FileSystemManager.createFolder}.
 */
export interface CreateFolderOptions {
	/**
	 * When `true` (default), creates all intermediate directories, like `mkdir -p`.
	 * When `false`, throws if the parent directory does not exist.
	 */
	recursive?: boolean;
	/**
	 * When `true`, throws if the directory already exists.
	 * When `false` (default), silently succeeds if the directory is already present.
	 */
	failIfExists?: boolean;
}

/**
 * Options for {@link FileSystemManager.renameEntry}.
 */
export interface RenameOptions {
	/**
	 * When `true`, throws if something already exists at `newPath`.
	 * When `false` (default), the existing entry at `newPath` is atomically
	 * replaced (standard POSIX rename behaviour).
	 */
	failIfExists?: boolean;
}

/**
 * Result returned by {@link FileSystemManager.renameEntry}.
 */
export interface RenameResult {
	/** The resolved absolute path the entry now lives at. */
	newPath: string;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Narrow an unknown caught value to a {@link NodeJS.ErrnoException} so that
 * the `.code` property is safely accessible.
 */
function asErrno(err: unknown): NodeJS.ErrnoException {
	return err as NodeJS.ErrnoException;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

/**
 * FileSystemManager provides a security-aware, production-grade abstraction
 * over Node.js file system primitives for the Electron main process.
 *
 * Security:
 *   - Every path is validated through {@link PathValidator} before any I/O
 *     is performed. Paths outside the allowed base directories
 *     (Documents, Downloads, Desktop, userData) are rejected with an Error.
 *
 * Supported operations:
 *   - {@link readFile}    — Read a file's content as a string
 *   - {@link writeFile}   — Write (or overwrite) a file atomically
 *   - {@link createFile}  — Create a new file, optionally with initial content
 *   - {@link createFolder} — Create a directory, optionally recursive
 *   - {@link renameEntry} — Rename or move a file or directory
 *
 * All operations are async and use `fs/promises` exclusively.
 */
export class FileSystemManager {
	private static readonly LOG_SOURCE = 'FileSystemManager';

	constructor(private readonly logger?: LoggerService) {}

	// -------------------------------------------------------------------------
	// Read
	// -------------------------------------------------------------------------

	/**
	 * Read a file and return its content as a string.
	 *
	 * @param filePath - Absolute path to the file to read.
	 * @param options  - Optional encoding (defaults to `'utf-8'`).
	 * @returns The file content.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If the file does not exist (`ENOENT`).
	 * @throws {Error} If the process lacks read permission (`EACCES`).
	 * @throws {Error} If any other I/O error occurs.
	 */
	async readFile(filePath: string, options: ReadFileOptions = {}): Promise<string> {
		const { encoding = 'utf-8' } = options;

		PathValidator.assertPathSafe(filePath);

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
			`Reading file: ${filePath} (encoding: ${encoding})`
		);

		try {
			const content = await fs.readFile(filePath, encoding);
			this.logger?.debug(FileSystemManager.LOG_SOURCE, `Read ${content.length} chars: ${filePath}`);
			return content;
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'ENOENT') {
				throw new Error(`File not found: ${filePath}`);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied reading file: ${filePath}`);
			}
			if (error.code === 'EISDIR') {
				throw new Error(`Path is a directory, not a file: ${filePath}`);
			}
			throw new Error(`Failed to read file "${filePath}": ${error.message}`);
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
	 * temporary `.tmp` sibling in the same directory, then renamed into the
	 * final path. This guarantees the file is never left in a half-written
	 * state if the process crashes mid-operation.
	 *
	 * @param filePath - Absolute path of the destination file.
	 * @param content  - String content to write.
	 * @param options  - Encoding and atomicity options.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If the parent directory does not exist.
	 * @throws {Error} If the process lacks write permission.
	 * @throws {Error} If any other I/O error occurs.
	 */
	async writeFile(
		filePath: string,
		content: string,
		options: WriteFileOptions = {}
	): Promise<void> {
		const { encoding = 'utf-8', atomic = true } = options;

		PathValidator.assertPathSafe(filePath);

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
			`Writing file: ${filePath} (atomic: ${atomic}, encoding: ${encoding})`
		);

		try {
			if (atomic) {
				await this.writeFileAtomic(filePath, content, encoding);
			} else {
				await fs.writeFile(filePath, content, encoding);
			}
			this.logger?.debug(
				FileSystemManager.LOG_SOURCE,
				`Wrote ${content.length} chars: ${filePath}`
			);
		} catch (err) {
			// Re-throw errors we already wrapped (from writeFileAtomic)
			if (err instanceof Error && err.message.startsWith('Failed to write')) {
				throw err;
			}
			const error = asErrno(err);
			if (error.code === 'ENOENT') {
				throw new Error(
					`Parent directory does not exist for: ${filePath}. Create it first with createFolder().`
				);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied writing file: ${filePath}`);
			}
			if (error.code === 'EISDIR') {
				throw new Error(`Path is a directory, not a file: ${filePath}`);
			}
			throw new Error(`Failed to write file "${filePath}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Create file
	// -------------------------------------------------------------------------

	/**
	 * Create a new file at `filePath`.
	 *
	 * Unlike {@link writeFile}, this operation is intended for initial creation.
	 * By default it silently succeeds if the file already exists. Pass
	 * `failIfExists: true` to make the operation exclusive.
	 *
	 * @param filePath - Absolute path of the file to create.
	 * @param options  - Initial content, encoding, and existence policy.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If `failIfExists` is `true` and the file already exists.
	 * @throws {Error} If the parent directory does not exist.
	 * @throws {Error} If the process lacks write permission.
	 * @throws {Error} If any other I/O error occurs.
	 */
	async createFile(filePath: string, options: CreateFileOptions = {}): Promise<void> {
		const { content = '', encoding = 'utf-8', failIfExists = false } = options;

		PathValidator.assertPathSafe(filePath);

		this.logger?.debug(FileSystemManager.LOG_SOURCE, `Creating file: ${filePath}`);

		// Use the 'wx' flag: write-only + exclusive (fails if file exists).
		// For the non-exclusive case we first check existence then write, accepting
		// the small TOCTOU window since the caller is opting into idempotent behaviour.
		const flag = 'wx';

		try {
			await fs.writeFile(filePath, content, { encoding, flag });
			this.logger?.debug(FileSystemManager.LOG_SOURCE, `Created file: ${filePath}`);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EEXIST') {
				if (failIfExists) {
					throw new Error(`File already exists: ${filePath}`);
				}
				// Silently succeed — caller opted into idempotent creation.
				this.logger?.debug(
					FileSystemManager.LOG_SOURCE,
					`File already exists, skipping creation: ${filePath}`
				);
				return;
			}
			if (error.code === 'ENOENT') {
				throw new Error(
					`Parent directory does not exist for: ${filePath}. Create it first with createFolder().`
				);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied creating file: ${filePath}`);
			}
			throw new Error(`Failed to create file "${filePath}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Create folder
	// -------------------------------------------------------------------------

	/**
	 * Create a directory at `folderPath`.
	 *
	 * By default this behaves like `mkdir -p` (recursive) and silently succeeds
	 * if the directory already exists. Pass `failIfExists: true` to enforce
	 * exclusive creation.
	 *
	 * @param folderPath - Absolute path of the directory to create.
	 * @param options    - Recursive and existence policy options.
	 *
	 * @throws {Error} If the path is outside allowed directories.
	 * @throws {Error} If `failIfExists` is `true` and the directory already exists.
	 * @throws {Error} If `recursive` is `false` and the parent does not exist.
	 * @throws {Error} If the process lacks write permission.
	 * @throws {Error} If any other I/O error occurs.
	 */
	async createFolder(folderPath: string, options: CreateFolderOptions = {}): Promise<void> {
		const { recursive = true, failIfExists = false } = options;

		PathValidator.assertPathSafe(folderPath);

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
			`Creating folder: ${folderPath} (recursive: ${recursive})`
		);

		try {
			await fs.mkdir(folderPath, { recursive });
			this.logger?.debug(FileSystemManager.LOG_SOURCE, `Created folder: ${folderPath}`);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EEXIST') {
				if (failIfExists) {
					throw new Error(`Folder already exists: ${folderPath}`);
				}
				// Silently succeed — caller opted into idempotent creation.
				this.logger?.debug(
					FileSystemManager.LOG_SOURCE,
					`Folder already exists, skipping creation: ${folderPath}`
				);
				return;
			}
			if (error.code === 'ENOENT') {
				// Only reachable when recursive is false and parent is missing.
				throw new Error(
					`Parent directory does not exist for: ${folderPath}. Use recursive: true or create the parent first.`
				);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied creating folder: ${folderPath}`);
			}
			throw new Error(`Failed to create folder "${folderPath}": ${error.message}`);
		}
	}

	// -------------------------------------------------------------------------
	// Rename / move
	// -------------------------------------------------------------------------

	/**
	 * Rename or move a file or directory from `oldPath` to `newPath`.
	 *
	 * Both paths must be within allowed directories. The destination's parent
	 * directory must already exist — this method does **not** create intermediate
	 * directories automatically.
	 *
	 * This wraps `fs.rename`, which is atomic on the same volume. Cross-volume
	 * moves (different drives on Windows, different mount points on Unix) will
	 * fail with `EXDEV`; in that case copy-then-delete must be used instead.
	 *
	 * @param oldPath - Current absolute path of the file or directory.
	 * @param newPath - Desired absolute destination path.
	 * @param options - Existence policy at the destination.
	 * @returns The resolved `newPath`.
	 *
	 * @throws {Error} If either path is outside allowed directories.
	 * @throws {Error} If `failIfExists` is `true` and `newPath` already exists.
	 * @throws {Error} If `oldPath` does not exist.
	 * @throws {Error} If the destination's parent directory does not exist.
	 * @throws {Error} If the rename crosses file-system boundaries (`EXDEV`).
	 * @throws {Error} If the process lacks the necessary permissions.
	 * @throws {Error} If any other I/O error occurs.
	 */
	async renameEntry(
		oldPath: string,
		newPath: string,
		options: RenameOptions = {}
	): Promise<RenameResult> {
		const { failIfExists = false } = options;

		PathValidator.assertPathSafe(oldPath);
		PathValidator.assertPathSafe(newPath);

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
			`Renaming: "${oldPath}" -> "${newPath}"`
		);

		// Verify the source exists before attempting the rename so that the
		// error message is actionable rather than a raw system error string.
		try {
			await fs.access(oldPath);
		} catch {
			throw new Error(`Source path does not exist: ${oldPath}`);
		}

		// Optionally guard against accidental overwrites.
		if (failIfExists) {
			try {
				await fs.access(newPath);
				// If access did not throw, the destination already exists.
				throw new Error(`Destination already exists: ${newPath}`);
			} catch (err) {
				// Re-throw the "already exists" error we just created above.
				if (err instanceof Error && err.message.startsWith('Destination already exists')) {
					throw err;
				}
				// ENOENT from fs.access means the destination is free — continue.
			}
		}

		// Ensure the destination's parent directory exists.
		const newParent = path.dirname(newPath);
		try {
			await fs.access(newParent);
		} catch {
			throw new Error(
				`Destination parent directory does not exist: ${newParent}. Create it first with createFolder().`
			);
		}

		try {
			await fs.rename(oldPath, newPath);
			this.logger?.debug(
				FileSystemManager.LOG_SOURCE,
				`Renamed: "${oldPath}" -> "${newPath}"`
			);
			return { newPath };
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'ENOENT') {
				throw new Error(`Source path does not exist: ${oldPath}`);
			}
			if (error.code === 'EACCES' || error.code === 'EPERM') {
				throw new Error(
					`Permission denied renaming "${oldPath}" to "${newPath}"`
				);
			}
			if (error.code === 'EXDEV') {
				throw new Error(
					`Cannot rename across file-system boundaries: "${oldPath}" -> "${newPath}". Use a copy-then-delete approach for cross-volume moves.`
				);
			}
			if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
				throw new Error(
					`Destination already exists and is not empty: ${newPath}`
				);
			}
			throw new Error(
				`Failed to rename "${oldPath}" to "${newPath}": ${error.message}`
			);
		}
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Write `content` to `filePath` atomically via a temporary sibling file.
	 *
	 * Steps:
	 *   1. Write to `<filePath>.<uuid>.tmp` in the same directory.
	 *   2. Rename the `.tmp` file over `filePath` (atomic on the same volume).
	 *   3. On failure, attempt to clean up the `.tmp` file.
	 *
	 * The temporary file is placed in the same directory as the destination so
	 * that the rename remains on the same file system and is therefore atomic.
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
			// Best-effort cleanup of the temporary file.
			try {
				await fs.unlink(tmpPath);
			} catch {
				// Ignore cleanup errors — the .tmp file will remain but will not
				// corrupt the target file.
			}

			const error = asErrno(err);
			if (error.code === 'ENOENT') {
				throw new Error(
					`Parent directory does not exist for: ${filePath}. Create it first with createFolder().`
				);
			}
			if (error.code === 'EACCES') {
				throw new Error(`Permission denied writing file: ${filePath}`);
			}
			throw new Error(`Failed to write file "${filePath}": ${error.message}`);
		}
	}
}
