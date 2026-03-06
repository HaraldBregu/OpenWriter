import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PathValidator } from './PathValidator';
import type { LoggerService } from '../services/logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Text encodings accepted by read/write operations.
 *
 * `base64` and `hex` are intentionally excluded: they are binary-transport
 * encodings, not text-file encodings, and exposing them over IPC creates an
 * unnecessary attack surface for a text-editor application.
 */
export type FileEncoding = 'utf-8' | 'utf8' | 'ascii' | 'latin1';

/** Options for {@link FileSystemManager.readFile}. */
export interface ReadFileOptions {
	/** Character encoding. Defaults to `'utf-8'`. */
	encoding?: FileEncoding;
}

/** Options for {@link FileSystemManager.writeFile}. */
export interface WriteFileOptions {
	/** Character encoding. Defaults to `'utf-8'`. */
	encoding?: FileEncoding;
	/**
	 * When `true` (default), the content is first written to a temporary sibling
	 * file and then atomically renamed into place. This prevents the target file
	 * from being left in a half-written state if the process crashes mid-write.
	 *
	 * Set to `false` only when the destination filesystem does not support
	 * rename within the same directory (e.g. certain network mounts).
	 */
	atomic?: boolean;
	/**
	 * When `true`, creates missing parent directories before writing.
	 * When `false` (default), throws if the parent directory does not exist.
	 */
	createParents?: boolean;
}

/** Options for {@link FileSystemManager.createFile}. */
export interface CreateFileOptions {
	/** Initial text content for the new file. Defaults to an empty string. */
	content?: string;
	/** Character encoding for the initial content. Defaults to `'utf-8'`. */
	encoding?: FileEncoding;
	/**
	 * When `true`, throws if the file already exists.
	 * When `false` (default), silently succeeds if the file is already present.
	 */
	failIfExists?: boolean;
	/**
	 * When `true`, creates missing parent directories before creating the file.
	 * When `false` (default), throws if the parent directory does not exist.
	 */
	createParents?: boolean;
}

/** Options for {@link FileSystemManager.createFolder}. */
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

/** Options for {@link FileSystemManager.renameEntry}. */
export interface RenameOptions {
	/**
	 * When `true` (default), throws if something already exists at `newPath`.
	 * This is the safe default for a text editor to prevent accidental overwrites.
	 *
	 * Set to `false` to restore standard POSIX rename semantics, which
	 * atomically replaces an existing destination.
	 */
	failIfExists?: boolean;
}

/** Result returned by {@link FileSystemManager.renameEntry}. */
export interface RenameResult {
	/** The resolved absolute path the entry now lives at. */
	newPath: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/**
 * Maximum file size accepted by {@link FileSystemManager.readFile} (64 MB).
 *
 * Loading very large files into a JS string can exhaust the V8 heap and freeze
 * the UI thread. Callers that need larger files should use a streaming service.
 */
const MAX_READ_SIZE_BYTES = 64 * 1024 * 1024;

/**
 * Maximum allowed file-name / folder-name length in characters.
 * Uses the shortest real-world limit (VFAT: 255 UTF-16 code units).
 */
const MAX_NAME_LENGTH = 255;

/** Windows reserved device names — blocked on all platforms for portability. */
const WINDOWS_RESERVED_NAME = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

/**
 * Narrow an unknown caught value to a {@link NodeJS.ErrnoException} so that
 * the `.code` property is safely accessible without a cast at every call site.
 */
function asErrno(err: unknown): NodeJS.ErrnoException {
	return err as NodeJS.ErrnoException;
}

// ---------------------------------------------------------------------------
// FileSystemManager
// ---------------------------------------------------------------------------

/**
 * FileSystemManager provides a security-aware, production-grade abstraction
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
export class FileSystemManager {
	private static readonly LOG_SOURCE = 'FileSystemManager';

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
		this.assertValidEncoding(encoding);
		const resolved = this.assertPathSafe(filePath);

		// Check the file size before allocating a potentially massive buffer.
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
			FileSystemManager.LOG_SOURCE,
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
		this.assertValidEncoding(encoding);
		const resolved = this.assertPathSafe(filePath);

		if (createParents) {
			await this.ensureParentDirectory(resolved);
		}

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
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
			FileSystemManager.LOG_SOURCE,
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
		this.assertValidEncoding(encoding);
		const resolved = this.assertPathSafe(filePath);
		this.assertValidName(path.basename(resolved));

		if (createParents) {
			await this.ensureParentDirectory(resolved);
		}

		this.logger?.debug(FileSystemManager.LOG_SOURCE, `createFile: ${resolved}`);

		try {
			// 'wx' = O_WRONLY | O_CREAT | O_EXCL — fails if the file already exists.
			await fs.writeFile(resolved, content, { encoding, flag: 'wx' });
			this.logger?.debug(FileSystemManager.LOG_SOURCE, `createFile success: ${resolved}`);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EEXIST') {
				if (failIfExists) {
					throw new Error(`File already exists: ${resolved}`);
				}
				// Silently succeed — caller opted into idempotent creation.
				this.logger?.debug(
					FileSystemManager.LOG_SOURCE,
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
		const resolved = this.assertPathSafe(folderPath);
		this.assertValidName(path.basename(resolved));

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
			`createFolder: ${resolved} (recursive: ${recursive})`
		);

		try {
			await fs.mkdir(resolved, { recursive });
			this.logger?.debug(FileSystemManager.LOG_SOURCE, `createFolder success: ${resolved}`);
		} catch (err) {
			const error = asErrno(err);
			if (error.code === 'EEXIST') {
				if (failIfExists) {
					throw new Error(`Folder already exists: ${resolved}`);
				}
				// Silently succeed — caller opted into idempotent creation.
				this.logger?.debug(
					FileSystemManager.LOG_SOURCE,
					`createFolder: directory already exists, skipping: ${resolved}`
				);
				return;
			}
			if (error.code === 'ENOENT') {
				// Only reachable when recursive is false and the parent is missing.
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
	 * `fs.rename` is atomic on the same filesystem volume. Cross-volume moves
	 * (different drives on Windows, different mount points on Unix) will fail
	 * with `EXDEV`; in that case copy-then-delete must be used instead.
	 *
	 * The default for `failIfExists` is `true` (unlike raw POSIX rename) because
	 * silently overwriting a file in a text editor is almost always a bug.
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
		// Default to true — overwriting an existing file is almost always unintentional.
		const { failIfExists = true } = options;

		const resolvedOld = this.assertPathSafe(oldPath);
		const resolvedNew = this.assertPathSafe(newPath);
		this.assertValidName(path.basename(resolvedNew));

		this.logger?.debug(
			FileSystemManager.LOG_SOURCE,
			`renameEntry: "${resolvedOld}" -> "${resolvedNew}"`
		);

		// Verify the source exists with an actionable error message.
		try {
			await fs.access(resolvedOld);
		} catch {
			throw new Error(`Source path does not exist: ${resolvedOld}`);
		}

		// Guard against accidental overwrites (our safe default).
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

		// Verify the destination's parent directory exists.
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
				FileSystemManager.LOG_SOURCE,
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
	// Security helpers
	// -------------------------------------------------------------------------

	/**
	 * Resolve `inputPath` to an absolute path and verify it falls inside one of
	 * the allowed root directories.
	 *
	 * Checked in order:
	 *   1. The four standard Electron paths via {@link PathValidator}.
	 *   2. The caller-supplied extra roots (e.g. the current workspace path).
	 *
	 * @returns The resolved, normalised absolute path.
	 * @throws {Error} If the path is not within any allowed root.
	 */
	private assertPathSafe(inputPath: string): string {
		if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
			throw new Error('FileSystemManager: path must be a non-empty string');
		}

		const resolved = path.normalize(path.resolve(inputPath));

		// Check against Electron's standard safe directories.
		if (PathValidator.isPathSafe(resolved)) {
			return resolved;
		}

		// Check against caller-supplied extra roots (e.g. the workspace path).
		// Use a trailing separator to prevent "/workspace" matching "/workspace2".
		for (const root of this.extraRoots) {
			if (resolved === root || resolved.startsWith(root + path.sep)) {
				return resolved;
			}
		}

		throw new Error(
			`FileSystemManager: path "${resolved}" is outside the allowed directories. ` +
				`Allowed roots: [${[...PathValidator.getAllowedPaths(), ...this.extraRoots].join(', ')}]`
		);
	}

	/**
	 * Validate that a bare filename or folder name is safe for the target
	 * filesystem. Rejects null bytes, path separators, names that are just
	 * dots, Windows reserved device names, and overlong names.
	 *
	 * This is called on the *basename* of the final path component to catch
	 * degenerate names before any filesystem call is attempted.
	 */
	private assertValidName(name: string): void {
		if (!name || name.trim().length === 0) {
			throw new Error('FileSystemManager: file/folder name must not be empty');
		}
		if (name.length > MAX_NAME_LENGTH) {
			throw new Error(
				`FileSystemManager: name "${name}" exceeds the maximum length of ${MAX_NAME_LENGTH} characters`
			);
		}
		// Null bytes are never valid in filesystem names.
		if (name.includes('\0')) {
			throw new Error('FileSystemManager: file/folder name must not contain null bytes');
		}
		// Path separators inside a bare name indicate traversal intent.
		if (name.includes('/') || name.includes('\\')) {
			throw new Error('FileSystemManager: file/folder name must not contain path separators');
		}
		// Names that are only dots are special (current/parent dir references).
		if (/^\.+$/.test(name)) {
			throw new Error('FileSystemManager: file/folder name must not be "." or ".."');
		}
		// Windows reserved device names — block on all platforms for portability.
		if (WINDOWS_RESERVED_NAME.test(name)) {
			throw new Error(`FileSystemManager: "${name}" is a reserved filesystem name on Windows`);
		}
	}

	/** Reject encoding values that are not in the allowed set. */
	private assertValidEncoding(encoding: string): void {
		const allowed: readonly string[] = ['utf-8', 'utf8', 'ascii', 'latin1'];
		if (!allowed.includes(encoding)) {
			throw new Error(
				`FileSystemManager: unsupported encoding "${encoding}". ` +
					`Allowed values: ${allowed.join(', ')}`
			);
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
			// Any other error from mkdir({recursive:true}) is unexpected.
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
	 *
	 * The `.` prefix makes the temp file hidden on Unix, reducing the chance of
	 * it appearing in directory listings that the user or watcher might act on.
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
			// Best-effort cleanup of the temporary file before re-throwing.
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
