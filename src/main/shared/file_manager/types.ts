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
