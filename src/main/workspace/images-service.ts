import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { RESOURCES_IMAGES_EXTENSIONS, type ImageEntry } from '../../shared/types';
import type { FileManager } from '../shared/file_manager';
import type { LoggerService } from '../services/logger';

const IMAGES_SUBFOLDER = 'images';

const ALLOWED_IMAGE_EXTENSIONS = new Set<string>(RESOURCES_IMAGES_EXTENSIONS);

/**
 * ImagesService manages files within the workspace `resources/images/` sub-folder.
 *
 * Responsibilities:
 *   - List all image files in resources/images/
 *   - Build ImageEntry metadata from filesystem stats
 */
export class ImagesService {
	private static readonly LOG_SOURCE = 'ImagesService';

	constructor(
		private readonly fileManager: FileManager,
		private readonly logger?: LoggerService
	) {}

	/**
	 * Get the absolute path to the images directory for a workspace.
	 */
	getImagesDir(workspacePath: string): string {
		return path.join(workspacePath, 'resources', IMAGES_SUBFOLDER);
	}

	/**
	 * Ensure the resources/images/ directory exists.
	 */
	async ensureImagesDir(workspacePath: string): Promise<void> {
		const imagesDir = this.getImagesDir(workspacePath);
		await fsPromises.mkdir(imagesDir, { recursive: true });
	}

	/**
	 * Load all image files from the workspace resources/images/ directory.
	 */
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

			const imagePath = path.join(imagesDir, entry.name);
			try {
				const stats = await fsPromises.stat(imagePath);
				const metadata = this.fileManager.createFileMetadata(entry.name, imagePath, stats);
				entries.push({
					id: entry.name,
					name: entry.name,
					path: imagePath,
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
}
