import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { IMAGES_EXTENSIONS, type ImageEntry } from '../../shared/types';
import type { FileManager } from '../shared/file_manager';
import type { LoggerService } from '../services/logger';

const IMAGES_SUBFOLDER = 'images';

const ALLOWED_IMAGE_EXTENSIONS = new Set<string>(IMAGES_EXTENSIONS);

/**
 * ImagesService manages files within the workspace `images/` top-level folder.
 */
export class ImagesService {
	private static readonly LOG_SOURCE = 'ImagesService';

	constructor(
		private readonly fileManager: FileManager,
		private readonly logger?: LoggerService
	) {}

	getImagesDir(workspacePath: string): string {
		return path.join(workspacePath, IMAGES_SUBFOLDER);
	}

	async ensureImagesDir(workspacePath: string): Promise<void> {
		const imagesDir = this.getImagesDir(workspacePath);
		await fsPromises.mkdir(imagesDir, { recursive: true });
	}

	async getImages(workspacePath: string): Promise<ImageEntry[]> {
		const imagesDir = this.getImagesDir(workspacePath);

		try {
			await fsPromises.access(imagesDir);
		} catch {
			return [];
		}

		const dirEntries = await fsPromises.readdir(imagesDir, { withFileTypes: true });
		const entries: ImageEntry[] = [];

		for (const entry of dirEntries) {
			if (!entry.isFile()) continue;
			if (entry.name.startsWith('.') || entry.name.endsWith('.tmp')) continue;
			const ext = path.extname(entry.name).toLowerCase();
			if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) continue;

			const filePath = path.join(imagesDir, entry.name);
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
				this.logger?.warn(ImagesService.LOG_SOURCE, `Failed to stat image ${entry.name}`, err);
			}
		}

		return entries;
	}

	async insertImages(
		workspacePath: string,
		sourcePaths: string[],
		markWritten?: (destPath: string) => void
	): Promise<ImageEntry[]> {
		await this.ensureImagesDir(workspacePath);
		const imagesDir = this.getImagesDir(workspacePath);
		const imported: ImageEntry[] = [];

		for (const sourcePath of sourcePaths) {
			const ext = path.extname(sourcePath).toLowerCase();
			if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
				throw new Error(
					`Image type "${ext}" is not supported. Allowed types: ${[...ALLOWED_IMAGE_EXTENSIONS].join(', ')}`
				);
			}

			try {
				const metadata = await this.fileManager.copyFile(sourcePath, imagesDir, markWritten);
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
					`Failed to import image ${path.basename(sourcePath)}: ${(err as Error).message}`
				);
			}
		}

		return imported;
	}

	async deleteImage(
		workspacePath: string,
		imageId: string,
		markWritten?: (filePath: string) => void
	): Promise<void> {
		const imagesDir = this.getImagesDir(workspacePath);
		const filePath = path.join(imagesDir, imageId);

		const realFilePath = await fsPromises.realpath(filePath);
		const realImagesDir = await fsPromises.realpath(imagesDir);

		if (!realFilePath.startsWith(realImagesDir)) {
			throw new Error('Cannot delete images outside the images directory');
		}

		markWritten?.(filePath);
		await this.fileManager.deleteFile(filePath);
	}
}
