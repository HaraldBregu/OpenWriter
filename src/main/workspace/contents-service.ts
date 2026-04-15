import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { FolderEntry, ResourceInfo } from '../../shared/types';
import type { FileManager } from '../shared/file_manager';
import type { LoggerService } from '../services/logger';

const CONTENTS_SUBFOLDER = 'content';

/**
 * ContentsService manages files within the workspace `resources/content/` sub-folder.
 *
 * Responsibilities:
 *   - List all files in resources/content/
 *   - Copy files into resources/content/ (insert)
 *   - Delete files from resources/content/
 *   - Build ResourceInfo metadata from filesystem stats
 */
export class ContentsService {
	private static readonly LOG_SOURCE = 'ContentsService';

	constructor(
		private readonly fileManager: FileManager,
		private readonly logger?: LoggerService
	) {}

	/**
	 * Get the absolute path to the contents directory for a workspace.
	 */
	getContentsDir(workspacePath: string): string {
		return path.join(workspacePath, 'resources', CONTENTS_SUBFOLDER);
	}

	/**
	 * Ensure the resources/content/ directory exists.
	 */
	async ensureContentsDir(workspacePath: string): Promise<void> {
		const contentsDir = this.getContentsDir(workspacePath);
		await fsPromises.mkdir(contentsDir, { recursive: true });
	}

	/**
	 * Load all files from the workspace resources/content/ directory.
	 */
	async getContents(workspacePath: string): Promise<ResourceInfo[]> {
		const contentsDir = this.getContentsDir(workspacePath);

		try {
			await fsPromises.access(contentsDir);
		} catch {
			return [];
		}

		const dirEntries = await fsPromises.readdir(contentsDir, { withFileTypes: true });
		const entries: ResourceInfo[] = [];

		for (const entry of dirEntries) {
			if (!entry.isFile()) continue;
			if (entry.name.startsWith('.') || entry.name.endsWith('.tmp')) continue;

			const filePath = path.join(contentsDir, entry.name);
			try {
				const stats = await fsPromises.stat(filePath);
				const metadata = this.fileManager.createFileMetadata(entry.name, filePath, stats);
				entries.push({
					id: metadata.id,
					name: metadata.name,
					path: metadata.path,
					size: metadata.size,
					mimeType: metadata.mimeType,
					importedAt: metadata.importedAt,
					lastModified: metadata.lastModified,
				});
			} catch (err) {
				this.logger?.warn(ContentsService.LOG_SOURCE, `Failed to stat file ${entry.name}`, err);
			}
		}

		return entries;
	}

	/**
	 * Load all sub-folders and markdown files from the workspace resources/content/ directory.
	 * Returns directories as kind='folder' and .md files as kind='file'.
	 */
	async getFolders(workspacePath: string): Promise<FolderEntry[]> {
		const contentsDir = this.getContentsDir(workspacePath);

		try {
			await fsPromises.access(contentsDir);
		} catch {
			return [];
		}

		const dirEntries = await fsPromises.readdir(contentsDir, { withFileTypes: true });
		const entries: FolderEntry[] = [];

		for (const entry of dirEntries) {
			if (entry.name.startsWith('.')) continue;

			const entryPath = path.join(contentsDir, entry.name);
			const isDirectory = entry.isDirectory();
			const isMarkdown = entry.isFile() && entry.name.endsWith('.md');

			if (!isDirectory && !isMarkdown) continue;

			try {
				const stats = await fsPromises.stat(entryPath);
				entries.push({
					kind: isDirectory ? 'folder' : 'file',
					id: entry.name,
					name: entry.name,
					path: entryPath,
					relativePath: entry.name,
					createdAt: stats.birthtimeMs || stats.ctimeMs,
					modifiedAt: stats.mtimeMs,
				});
			} catch (err) {
				this.logger?.warn(
					ContentsService.LOG_SOURCE,
					`Failed to stat entry ${entry.name}`,
					err
				);
			}
		}

		return entries;
	}

	/**
	 * Insert (copy) files into the workspace resources/content/ directory.
	 *
	 * @param workspacePath - Workspace root path
	 * @param sourcePaths - Absolute paths of source files to copy
	 * @param markWritten - Optional callback to mark files as written (prevents watcher loops)
	 * @returns Array of ResourceInfo for the newly copied files
	 */
	async insertContents(
		workspacePath: string,
		sourcePaths: string[],
		markWritten?: (destPath: string) => void
	): Promise<ResourceInfo[]> {
		await this.ensureContentsDir(workspacePath);
		const contentsDir = this.getContentsDir(workspacePath);
		const imported: ResourceInfo[] = [];

		for (const sourcePath of sourcePaths) {
			try {
				const metadata = await this.fileManager.copyFile(sourcePath, contentsDir, markWritten);
				imported.push({
					id: metadata.id,
					name: metadata.name,
					path: metadata.path,
					size: metadata.size,
					mimeType: metadata.mimeType,
					importedAt: metadata.importedAt,
					lastModified: metadata.lastModified,
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
	 * Delete a file or folder from the workspace resources/content/ directory.
	 *
	 * @param workspacePath - Workspace root path
	 * @param entryId - The entry ID (basename) to delete
	 * @param markWritten - Optional callback to mark files as written (prevents watcher loops)
	 */
	async deleteContent(
		workspacePath: string,
		entryId: string,
		markWritten?: (filePath: string) => void
	): Promise<void> {
		const contentsDir = this.getContentsDir(workspacePath);
		const entryPath = path.join(contentsDir, entryId);

		const realEntryPath = await fsPromises.realpath(entryPath);
		const realContentsDir = await fsPromises.realpath(contentsDir);

		if (!realEntryPath.startsWith(realContentsDir)) {
			throw new Error('Cannot delete entries outside the contents directory');
		}

		const stats = await fsPromises.stat(realEntryPath);
		markWritten?.(entryPath);
		if (stats.isDirectory()) {
			await fsPromises.rm(realEntryPath, { recursive: true, force: true });
		} else {
			await this.fileManager.deleteFile(realEntryPath);
		}
	}
}
