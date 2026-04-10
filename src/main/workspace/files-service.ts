import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { FileEntry } from '../../shared/types';
import type { FileManager } from '../shared/file_manager';
import type { LoggerService } from '../services/logger';

const FILES_SUBFOLDER = 'files';

const ALLOWED_FILE_EXTENSIONS = new Set(['.json', '.png', '.jpg', '.jpeg', '.pdf']);

/**
 * FilesService manages files within the workspace `resources/files/` sub-folder.
 *
 * Responsibilities:
 *   - List all files in resources/files/
 *   - Copy files into resources/files/ (insert)
 *   - Delete files from resources/files/
 *   - Build FileEntry metadata from filesystem stats
 */
export class FilesService {
	private static readonly LOG_SOURCE = 'FilesService';

	constructor(
		private readonly fileManager: FileManager,
		private readonly logger?: LoggerService
	) {}

	/**
	 * Get the absolute path to the files directory for a workspace.
	 */
	getFilesDir(workspacePath: string): string {
		return path.join(workspacePath, 'resources', FILES_SUBFOLDER);
	}

	/**
	 * Ensure the resources/files/ directory exists.
	 */
	async ensureFilesDir(workspacePath: string): Promise<void> {
		const filesDir = this.getFilesDir(workspacePath);
		await fsPromises.mkdir(filesDir, { recursive: true });
	}

	/**
	 * Load all files from the workspace resources/files/ directory.
	 */
	async getFiles(workspacePath: string): Promise<FileEntry[]> {
		const filesDir = this.getFilesDir(workspacePath);

		try {
			await fsPromises.access(filesDir);
		} catch {
			return [];
		}

		const dirEntries = await fsPromises.readdir(filesDir, { withFileTypes: true });
		const entries: FileEntry[] = [];

		for (const entry of dirEntries) {
			if (!entry.isFile()) continue;
			if (entry.name.startsWith('.') || entry.name.endsWith('.tmp')) continue;
			const ext = path.extname(entry.name).toLowerCase();
			if (!ALLOWED_FILE_EXTENSIONS.has(ext)) continue;

			const filePath = path.join(filesDir, entry.name);
			try {
				const stats = await fsPromises.stat(filePath);
				const metadata = this.fileManager.createFileMetadata(entry.name, filePath, stats);
				entries.push({
					id: entry.name,
					name: entry.name,
					path: filePath,
					relativePath: entry.name,
					size: stats.size,
					mimeType: metadata.mimeType,
					createdAt: metadata.importedAt,
					modifiedAt: stats.mtimeMs,
				});
			} catch (err) {
				this.logger?.warn(FilesService.LOG_SOURCE, `Failed to stat file ${entry.name}`, err);
			}
		}

		return entries;
	}

	/**
	 * Insert (copy) files into the workspace resources/files/ directory.
	 *
	 * @param workspacePath - Workspace root path
	 * @param sourcePaths - Absolute paths of source files to copy
	 * @param markWritten - Optional callback to mark files as written (prevents watcher loops)
	 * @returns Array of FileEntry for the newly copied files
	 */
	async insertFiles(
		workspacePath: string,
		sourcePaths: string[],
		markWritten?: (destPath: string) => void
	): Promise<FileEntry[]> {
		await this.ensureFilesDir(workspacePath);
		const filesDir = this.getFilesDir(workspacePath);
		const imported: FileEntry[] = [];

		for (const sourcePath of sourcePaths) {
			const ext = path.extname(sourcePath).toLowerCase();
			if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
				throw new Error(
					`File type "${ext}" is not supported. Allowed types: ${[...ALLOWED_FILE_EXTENSIONS].join(', ')}`
				);
			}

			try {
				const metadata = await this.fileManager.copyFile(sourcePath, filesDir, markWritten);
				imported.push({
					id: metadata.id,
					name: metadata.name,
					path: metadata.path,
					relativePath: metadata.name,
					size: metadata.size,
					mimeType: metadata.mimeType,
					createdAt: metadata.importedAt,
					modifiedAt: metadata.lastModified,
				});
			} catch (err) {
				throw new Error(
					`Failed to import file ${path.basename(sourcePath)}: ${(err as Error).message}`
				);
			}
		}

		return imported;
	}

	/**
	 * Delete a file from the workspace resources/files/ directory.
	 *
	 * @param workspacePath - Workspace root path
	 * @param fileId - The file ID (basename) to delete
	 * @param markWritten - Optional callback to mark files as written (prevents watcher loops)
	 */
	async deleteFile(
		workspacePath: string,
		fileId: string,
		markWritten?: (filePath: string) => void
	): Promise<void> {
		const filesDir = this.getFilesDir(workspacePath);
		const filePath = path.join(filesDir, fileId);

		const realFilePath = await fsPromises.realpath(filePath);
		const realFilesDir = await fsPromises.realpath(filesDir);

		if (!realFilePath.startsWith(realFilesDir)) {
			throw new Error('Cannot delete files outside the files directory');
		}

		markWritten?.(filePath);
		await this.fileManager.deleteFile(filePath);
	}
}
