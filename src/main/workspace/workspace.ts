import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { Disposable } from '../core/service-container';
import type { WorkspaceService } from './workspace-service';
import type { FileMetadata } from '../shared/file_manager';
import type { WorkspaceMetadataService } from './workspace-metadata';
import type { DocumentsWatcherService } from './documents-watcher';
import type {
	OutputFilesService,
	OutputFile,
	OutputType,
	SaveOutputFileInput,
	SaveOutputFileResult,
	UpdateOutputFileInput,
} from './output-files';
import { VALID_OUTPUT_TYPES } from './output-files';
import { DocumentsService } from './documents';
import type { LoggerService } from '../services/logger';
import type {
	DirectoryEntry,
	DirectoryAddManyResult,
	DirectoryValidationResult,
	IndexingInfo,
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFileParams,
	FsCreateFolderParams,
	FsDeleteFolderParams,
	FsRenameParams,
	FsRenameResult,
	FsListDirParams,
	FsListDirEntry,
	ProjectWorkspaceInfo,
	DocumentConfig,
	WorkspaceInfo,
} from '../../shared/types';
import type { ProjectWorkspaceService } from './project-workspace';
import { FileManager } from '../shared/file_manager';
import { DEFAULT_TEXT_MODEL_ID } from '../../shared/types';
import { DEFAULT_IMAGE_MODEL_ID } from '../../shared/models';

const DATA_DIR = 'data';
const RESOURCES_DIR = 'resources';
const INDEXING_INFO_FILE = 'indexing-info.json';

/**
 * Workspace is a Facade over all workspace domain services.
 *
 * It centralizes workspace operations so that the IPC layer becomes a thin
 * pass-through with no business logic. Electron-specific APIs (dialog, shell)
 * remain in the IPC layer; this class has no Electron dependency.
 */
export class Workspace implements Disposable {
	private readonly documents: DocumentsService;

	constructor(
		private readonly workspace: WorkspaceService,
		private readonly fileManagement: FileManager,
		private readonly metadata: WorkspaceMetadataService,
		private readonly watcher: DocumentsWatcherService | null,
		private readonly outputFiles: OutputFilesService,
		private readonly projectWorkspace: ProjectWorkspaceService,
		private readonly logger: LoggerService
	) {
		this.documents = new DocumentsService(this.fileManagement, this.watcher);
	}

	destroy(): void {
		// No-op: sub-services manage their own lifecycle via ServiceContainer
	}

	// -------------------------------------------------------------------------
	// Workspace state
	// -------------------------------------------------------------------------

	getCurrent(): string | null {
		return this.workspace.getCurrent();
	}

	async setCurrent(workspacePath: string): Promise<void> {
		this.logger.info('Workspace', `Setting workspace: ${workspacePath}`);
		this.workspace.setCurrent(workspacePath);
		await this.projectWorkspace.getOrCreate();
	}

	getRecent(): WorkspaceInfo[] {
		return this.workspace.getRecent().map((w) => ({
			...w,
			data: path.join(w.path, DATA_DIR),
			resources: path.join(w.path, RESOURCES_DIR),
		}));
	}

	clear(): void {
		this.workspace.clear();
	}

	removeRecent(workspacePath: string): void {
		this.workspace.removeRecent(workspacePath);
		this.logger.info('Workspace', `Removed from recent: ${workspacePath}`);
	}

	// -------------------------------------------------------------------------
	// Indexing info
	// -------------------------------------------------------------------------

	async getIndexingInfo(): Promise<IndexingInfo | null> {
		const currentWorkspace = this.requireWorkspace();
		const infoPath = path.join(currentWorkspace, DATA_DIR, INDEXING_INFO_FILE);
		try {
			const content = await fsPromises.readFile(infoPath, 'utf-8');
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	getDataFolderPath(): string {
		const currentWorkspace = this.requireWorkspace();
		const dataDir = path.join(currentWorkspace, DATA_DIR);
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
		return dataDir;
	}

	getResourcesFolderPath(): string {
		const currentWorkspace = this.requireWorkspace();
		const resourcesDir = path.join(currentWorkspace, RESOURCES_DIR);
		if (!fs.existsSync(resourcesDir)) {
			fs.mkdirSync(resourcesDir, { recursive: true });
		}
		return resourcesDir;
	}

	getDocumentFolderPath(documentId: string): string {
		if (!documentId || typeof documentId !== 'string') {
			throw new Error('Invalid document ID: must be a non-empty string');
		}
		const currentWorkspace = this.requireWorkspace();
		const documentDir = path.join(currentWorkspace, 'output', 'documents', documentId);
		if (!fs.existsSync(documentDir) || !fs.statSync(documentDir).isDirectory()) {
			throw new Error(`Document folder does not exist for ID "${documentId}".`);
		}
		const chatsDir = path.join(documentDir, 'chats');
		if (!fs.existsSync(chatsDir)) {
			fs.mkdirSync(chatsDir, { recursive: true });
		}
		return documentDir;
	}

	// -------------------------------------------------------------------------
	// Project workspace info
	// -------------------------------------------------------------------------

	async getProjectInfo(): Promise<ProjectWorkspaceInfo | null> {
		if (!this.workspace.getCurrent()) {
			return null;
		}
		return this.projectWorkspace.getOrCreate();
	}

	async updateProjectName(name: string): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateName(name);
	}

	async updateProjectDescription(description: string): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateDescription(description);
	}

	// -------------------------------------------------------------------------
	// Document config
	// -------------------------------------------------------------------------

	async getDocumentConfig(documentId: string): Promise<DocumentConfig> {
		const docPath = this.getDocumentFolderPath(documentId);
		const configFilePath = path.join(docPath, 'config.json');

		type StoredJson = {
			title?: string;
			emoji?: string;
			type?: string;
			createdAt?: string;
			updatedAt?: string;
			defaultTextModelId?: string;
			defaultImageModelId?: string;
		};

		let stored: StoredJson = {};
		try {
			const raw = await fsPromises.readFile(configFilePath, 'utf-8');
			stored = JSON.parse(raw) as StoredJson;
		} catch {
			// config.json doesn't exist yet
		}

		let textModel = stored.defaultTextModelId;
		let imageModel = stored.defaultImageModelId;

		return {
			title: stored.title ?? '',
			emoji: stored.emoji,
			type: stored.type ?? '',
			createdAt: stored.createdAt ?? '',
			updatedAt: stored.updatedAt ?? '',
			textModel,
			imageModel,
		};
	}

	async updateDocumentConfig(documentId: string, config: Partial<DocumentConfig>): Promise<void> {
		const docPath = this.getDocumentFolderPath(documentId);
		const configFilePath = path.join(docPath, 'config.json');

		let existing: Record<string, unknown> = {};
		try {
			const raw = await fsPromises.readFile(configFilePath, 'utf-8');
			existing = JSON.parse(raw) as Record<string, unknown>;
		} catch {
			// file doesn't exist yet
		}

		if (config.textModel !== undefined) {
			existing.defaultTextModelId = config.textModel;
		}
		if (config.imageModel !== undefined) {
			existing.defaultImageModelId = config.imageModel;
		}

		const manager = this.buildFileManager();
		await manager.writeFile(configFilePath, JSON.stringify(existing, null, 2));
	}

	// -------------------------------------------------------------------------
	// Documents
	// -------------------------------------------------------------------------

	async importFiles(filePaths: string[], extensions?: string[]): Promise<FileMetadata[]> {
		const currentWorkspace = this.requireWorkspace();
		return this.documents.importFiles(currentWorkspace, filePaths, extensions);
	}

	async importByPaths(paths: string[]): Promise<FileMetadata[]> {
		const currentWorkspace = this.requireWorkspace();
		return this.documents.importFiles(currentWorkspace, paths);
	}

	async downloadFromUrl(url: string): Promise<FileMetadata> {
		this.validateDownloadUrl(url);
		const currentWorkspace = this.requireWorkspace();
		return this.documents.downloadFromUrl(currentWorkspace, url);
	}

	async loadDocuments(): Promise<FileMetadata[]> {
		const currentWorkspace = this.requireWorkspace();
		return this.documents.loadAll(currentWorkspace);
	}

	async deleteDocument(id: string): Promise<void> {
		const currentWorkspace = this.requireWorkspace();
		await this.documents.deleteFile(id, currentWorkspace);
	}

	// -------------------------------------------------------------------------
	// Directories
	// -------------------------------------------------------------------------

	getDirectories(): DirectoryEntry[] {
		return this.metadata.getDirectories();
	}

	addDirectory(dirPath: string): DirectoryEntry {
		return this.metadata.addDirectory(dirPath);
	}

	addDirectories(dirPaths: string[]): DirectoryAddManyResult {
		return this.metadata.addDirectories(dirPaths);
	}

	removeDirectory(id: string): boolean {
		return this.metadata.removeDirectory(id);
	}

	validateDirectory(dirPath: string): DirectoryValidationResult {
		return this.metadata.validateDirectory(dirPath);
	}

	markDirectoryIndexed(id: string, isIndexed: boolean): boolean {
		return this.metadata.markDirectoryIndexed(id, isIndexed);
	}

	// -------------------------------------------------------------------------
	// Output files
	// -------------------------------------------------------------------------

	async saveOutput(input: SaveOutputFileInput): Promise<SaveOutputFileResult> {
		this.validateOutputInput(input);
		const result = await this.outputFiles.save(input);
		this.logger.info('Workspace', `Saved output file for type ${input.type}: ${result.id}`);
		return result;
	}

	async loadOutputs(): Promise<OutputFile[]> {
		const files = await this.outputFiles.loadAll();
		this.logger.info('Workspace', `Loaded ${files.length} output files`);
		return files;
	}

	async loadOutputsByType(outputType: string): Promise<OutputFile[]> {
		this.validateOutputType(outputType);
		const files = await this.outputFiles.loadByType(outputType as OutputType);
		this.logger.info('Workspace', `Loaded ${files.length} output files for type "${outputType}"`);
		return files;
	}

	async loadOutput(params: { type: string; id: string }): Promise<OutputFile | null> {
		this.validateOutputTypeAndId(params);
		const file = await this.outputFiles.loadOne(params.type as OutputType, params.id);
		this.logger.info(
			'Workspace',
			file
				? `Loaded output file: ${params.type}/${params.id}`
				: `Output file not found: ${params.type}/${params.id}`
		);
		return file;
	}

	async updateOutput(params: {
		type: string;
		id: string;
		content: string;
		metadata: Record<string, unknown>;
	}): Promise<void> {
		this.validateOutputUpdateParams(params);
		await this.outputFiles.update(params.type as OutputType, params.id, {
			content: params.content,
			metadata: params.metadata as UpdateOutputFileInput['metadata'],
		});
		this.logger.info('Workspace', `Updated output file: ${params.type}/${params.id}`);
	}

	async deleteOutput(params: { type: string; id: string }): Promise<void> {
		this.validateOutputTypeAndId(params);
		await this.outputFiles.delete(params.type as OutputType, params.id);
		this.logger.info('Workspace', `Deleted output file: ${params.type}/${params.id}`);
	}

	async trashOutput(params: { type: string; id: string }): Promise<void> {
		this.validateOutputTypeAndId(params);
		await this.outputFiles.trash(params.type as OutputType, params.id);
		this.logger.info('Workspace', `Trashed output file: ${params.type}/${params.id}`);
	}

	// -------------------------------------------------------------------------
	// Filesystem
	// -------------------------------------------------------------------------

	async readFile(params: FsReadFileParams): Promise<string> {
		this.validateFsParams(params, ['filePath']);
		const manager = this.buildFileManager();
		return manager.readFile(params.filePath, { encoding: params.encoding });
	}

	async writeFile(params: FsWriteFileParams): Promise<void> {
		this.validateFsParams(params, ['filePath', 'content']);
		if (typeof params.content !== 'string') {
			throw new Error('fs:write-file: content must be a string');
		}
		const manager = this.buildFileManager();
		await manager.writeFile(params.filePath, params.content, {
			encoding: params.encoding,
			atomic: params.atomic,
			createParents: params.createParents,
		});
	}

	async createFile(params: FsCreateFileParams): Promise<void> {
		this.validateFsParams(params, ['filePath']);
		if (params.content !== undefined && typeof params.content !== 'string') {
			throw new Error('fs:create-file: content must be a string when provided');
		}
		const manager = this.buildFileManager();
		await manager.createFile(params.filePath, {
			content: params.content,
			encoding: params.encoding,
			failIfExists: params.failIfExists,
			createParents: params.createParents,
		});
	}

	async createFolder(params: FsCreateFolderParams): Promise<void> {
		this.validateFsParams(params, ['folderPath']);
		const manager = this.buildFileManager();
		await manager.createFolder(params.folderPath, {
			recursive: params.recursive,
			failIfExists: params.failIfExists,
		});
	}

	async deleteFolder(params: FsDeleteFolderParams): Promise<void> {
		this.validateFsParams(params, ['folderPath']);
		const manager = this.buildFileManager();
		await manager.deleteFolder(params.folderPath, {
			recursive: params.recursive,
		});
	}

	async rename(params: FsRenameParams): Promise<FsRenameResult> {
		this.validateFsParams(params, ['oldPath', 'newPath']);
		const manager = this.buildFileManager();
		return manager.renameEntry(params.oldPath, params.newPath, {
			failIfExists: params.failIfExists,
		});
	}

	async listDir(params: FsListDirParams): Promise<FsListDirEntry[]> {
		this.validateFsParams(params, ['dirPath']);
		const manager = this.buildFileManager();
		return manager.listDir(params.dirPath);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	private requireWorkspace(): string {
		const current = this.workspace.getCurrent();
		if (!current) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}
		return current;
	}

	private validateDownloadUrl(url: string): void {
		const urlObj = new URL(url);

		if (urlObj.protocol !== 'https:') {
			throw new Error(`Invalid protocol "${urlObj.protocol}". Only HTTPS downloads are allowed.`);
		}

		const hostname = urlObj.hostname;
		const privatePatterns = [
			/^localhost$/i,
			/^127\./,
			/^192\.168\./,
			/^10\./,
			/^172\.(1[6-9]|2\d|3[01])\./,
			/^::1$/,
			/^fc00:/,
			/^fd00:/,
		];

		if (privatePatterns.some((pattern) => pattern.test(hostname))) {
			throw new Error(`Downloads from private networks are not allowed: ${hostname}`);
		}
	}

	private isValidOutputType(type: string): type is OutputType {
		return (VALID_OUTPUT_TYPES as readonly string[]).includes(type);
	}

	private validateOutputType(type: string): void {
		if (!type || typeof type !== 'string') {
			throw new Error('Invalid type: must be a non-empty string');
		}
		if (!this.isValidOutputType(type)) {
			throw new Error(
				`Invalid output type "${type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
			);
		}
	}

	private validateOutputTypeAndId(params: { type: string; id: string }): void {
		this.validateOutputType(params.type);
		if (!params.id || typeof params.id !== 'string') {
			throw new Error('Invalid id: must be a non-empty string');
		}
	}

	private validateOutputInput(input: SaveOutputFileInput): void {
		this.validateOutputType(input.type);
		if (typeof input.content !== 'string') {
			throw new Error('Invalid content: must be a string');
		}
		if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
			throw new Error('Invalid metadata: must be an object');
		}
	}

	private validateOutputUpdateParams(params: {
		type: string;
		id: string;
		content: string;
		metadata: Record<string, unknown>;
	}): void {
		this.validateOutputTypeAndId(params);
		if (typeof params.content !== 'string') {
			throw new Error('Invalid content: must be a string');
		}
		if (!params.metadata || typeof params.metadata !== 'object' || Array.isArray(params.metadata)) {
			throw new Error('Invalid metadata: must be an object');
		}
	}

	private buildFileManager(): FileManager {
		const extraRoots: string[] = [];
		const workspacePath = this.workspace.getCurrent();
		if (workspacePath) {
			extraRoots.push(workspacePath);
		}
		return new FileManager(this.logger, extraRoots);
	}

	private validateFsParams(params: unknown, required: string[]): void {
		if (params === null || typeof params !== 'object' || Array.isArray(params)) {
			throw new Error('Invalid payload: expected a plain object');
		}
		const record = params as Record<string, unknown>;
		for (const key of required) {
			const value = record[key];
			if (typeof value !== 'string' || value.trim().length === 0) {
				throw new Error(`Invalid payload: "${key}" must be a non-empty string`);
			}
		}
	}
}
