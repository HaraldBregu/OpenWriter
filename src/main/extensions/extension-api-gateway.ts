import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import type { TaskExecutor } from '../task/task-executor';
import type { WindowContextManager } from '../core/window-context';
import type { Workspace } from '../workspace';
import { WorkspaceChannels } from '../../shared/channels';
import type {
	DocumentConfig,
} from '../../shared/types';
import type {
	ExtensionDocumentSnapshot,
	ExtensionDocumentUpdate,
	ExtensionExecutionContext,
	ExtensionHostRequestMap,
	ExtensionInfo,
} from '../../../packages/openwriter-extension-types/src/index';

const STORAGE_DIR_NAME = 'extensions-data';

type HostMethod = keyof ExtensionHostRequestMap;

const HOST_PERMISSIONS: {
	[K in HostMethod]: ExtensionHostRequestMap[K]['permission'];
} = {
	'app.getInfo': 'app.read',
	'workspace.getCurrent': 'workspace.read',
	'documents.getActive': 'document.read',
	'documents.getById': 'document.read',
	'documents.update': 'document.write',
	'tasks.submit': 'task.submit',
	'storage.get': null,
	'storage.set': null,
	'storage.delete': null,
};

export interface ExtensionApiGatewayOptions {
	container: ServiceContainer;
	eventBus: EventBus;
	logger: LoggerService;
	windowContextManager: WindowContextManager;
	taskExecutor: TaskExecutor;
	getActiveDocumentId: (windowId?: number) => string | null;
}

export class ExtensionApiGateway {
	constructor(private readonly options: ExtensionApiGatewayOptions) {}

	async handle<TMethod extends HostMethod>(
		extension: ExtensionInfo,
		method: TMethod,
		args: ExtensionHostRequestMap[TMethod]['args'],
		context?: ExtensionExecutionContext
	): Promise<ExtensionHostRequestMap[TMethod]['result']> {
		this.assertPermission(extension, method);

		switch (method) {
			case 'app.getInfo':
				return {
					appName: app.getName(),
					version: app.getVersion(),
					platform: process.platform,
				} as ExtensionHostRequestMap[TMethod]['result'];
			case 'workspace.getCurrent':
				return (await this.getWorkspaceSnapshot(context)) as ExtensionHostRequestMap[TMethod]['result'];
			case 'documents.getActive':
				return (await this.getActiveDocument(context)) as ExtensionHostRequestMap[TMethod]['result'];
			case 'documents.getById': {
				const [documentId] = args as ExtensionHostRequestMap['documents.getById']['args'];
				return (await this.readDocument(documentId, context)) as ExtensionHostRequestMap[TMethod]['result'];
			}
			case 'documents.update': {
				const [documentId, patch] = args as ExtensionHostRequestMap['documents.update']['args'];
				return (await this.updateDocument(documentId, patch, context)) as ExtensionHostRequestMap[TMethod]['result'];
			}
			case 'tasks.submit': {
				const [submission] = args as ExtensionHostRequestMap['tasks.submit']['args'];
				return this.submitTask(extension.id, submission, context) as ExtensionHostRequestMap[TMethod]['result'];
			}
			case 'storage.get': {
				const [key] = args as ExtensionHostRequestMap['storage.get']['args'];
				return (await this.getStorageValue(extension.id, key)) as ExtensionHostRequestMap[TMethod]['result'];
			}
			case 'storage.set': {
				const [key, value] = args as ExtensionHostRequestMap['storage.set']['args'];
				return (await this.setStorageValue(extension.id, key, value)) as ExtensionHostRequestMap[TMethod]['result'];
			}
			case 'storage.delete': {
				const [key] = args as ExtensionHostRequestMap['storage.delete']['args'];
				await this.deleteStorageValue(extension.id, key);
				return undefined as ExtensionHostRequestMap[TMethod]['result'];
			}
		}
	}

	private assertPermission(extension: ExtensionInfo, method: HostMethod): void {
		const required = HOST_PERMISSIONS[method];
		if (!required) return;
		if (!extension.permissions.includes(required)) {
			throw new Error(`Extension "${extension.id}" does not have permission "${required}".`);
		}
	}

	private resolveWorkspaceManager(context?: ExtensionExecutionContext): {
		windowId: number;
		manager: Workspace;
	} {
		const windowId = this.resolveWindowId(context?.windowId);
		const windowContext = this.options.windowContextManager.get(windowId);
		const manager = windowContext.getService<Workspace>('workspaceManager', this.options.container);
		return { windowId, manager };
	}

	private resolveWindowId(windowId?: number): number {
		if (windowId && this.options.windowContextManager.has(windowId)) {
			return windowId;
		}

		const focused = BrowserWindow.getFocusedWindow();
		if (focused && this.options.windowContextManager.has(focused.id)) {
			return focused.id;
		}

		for (const window of BrowserWindow.getAllWindows()) {
			if (this.options.windowContextManager.has(window.id)) {
				return window.id;
			}
		}

		throw new Error('No active window context is available for the extension host call.');
	}

	private async getWorkspaceSnapshot(context?: ExtensionExecutionContext) {
		const { windowId, manager } = this.resolveWorkspaceManager(context);
		const info = await manager.getProjectInfo();
		return {
			currentPath: manager.getCurrent(),
			projectName: info?.name ?? null,
			windowId,
			documentId: this.options.getActiveDocumentId(windowId),
		};
	}

	private async getActiveDocument(
		context?: ExtensionExecutionContext
	): Promise<ExtensionDocumentSnapshot | null> {
		const { windowId } = this.resolveWorkspaceManager(context);
		const documentId = context?.documentId ?? this.options.getActiveDocumentId(windowId);
		if (!documentId) return null;
		return this.readDocument(documentId, { ...context, windowId, documentId });
	}

	private async readDocument(
		documentId: string,
		context?: ExtensionExecutionContext
	): Promise<ExtensionDocumentSnapshot> {
		const { windowId, manager } = this.resolveWorkspaceManager(context);
		const [content, config, pathOnDisk] = await Promise.all([
			manager.getDocumentContent(documentId),
			manager.getDocumentConfig(documentId),
			Promise.resolve(manager.getDocumentFolderPath(documentId)),
		]);
		return this.buildDocumentSnapshot(documentId, content, config, pathOnDisk, windowId);
	}

	private async updateDocument(
		documentId: string,
		patch: ExtensionDocumentUpdate,
		context?: ExtensionExecutionContext
	): Promise<ExtensionDocumentSnapshot> {
		const { windowId, manager } = this.resolveWorkspaceManager(context);

		if (patch.title !== undefined) {
			await manager.updateDocumentConfig(documentId, { title: patch.title });
			const config = await manager.getDocumentConfig(documentId);
			this.options.eventBus.broadcast(WorkspaceChannels.documentConfigChanged, {
				documentId,
				config,
			});
		}

		if (patch.content !== undefined) {
			await manager.updateDocumentContent(documentId, patch.content);
			this.options.eventBus.broadcast(WorkspaceChannels.documentContentChanged, {
				documentId,
				content: patch.content,
			});
		}

		const snapshot = await this.readDocument(documentId, { ...context, windowId, documentId });
		this.options.eventBus.emit('document:changed', {
			windowId,
			document: snapshot,
		});
		return snapshot;
	}

	private buildDocumentSnapshot(
		documentId: string,
		content: string,
		config: DocumentConfig,
		pathOnDisk: string,
		windowId: number
	): ExtensionDocumentSnapshot {
		return {
			id: documentId,
			title: config.title,
			content,
			path: pathOnDisk,
			windowId,
		};
	}

	private submitTask(
		extensionId: string,
		submission: ExtensionHostRequestMap['tasks.submit']['args'][0],
		context?: ExtensionExecutionContext
	) {
		const windowId = context?.windowId ?? this.resolveWindowId(context?.windowId);
		const taskId = this.options.taskExecutor.submit(submission.type, submission.input, {
			windowId,
			priority: submission.options?.priority,
			timeoutMs: submission.options?.timeoutMs,
			metadata: {
				...(submission.metadata ?? {}),
				source: 'extension',
				extensionId,
			},
		});

		return { taskId };
	}

	private getStorageDir(extensionId: string): string {
		return path.join(app.getPath('userData'), STORAGE_DIR_NAME, extensionId);
	}

	private getStorageFile(extensionId: string): string {
		return path.join(this.getStorageDir(extensionId), 'state.json');
	}

	private async readStorage(extensionId: string): Promise<Record<string, unknown>> {
		const filePath = this.getStorageFile(extensionId);
		try {
			const raw = await fsPromises.readFile(filePath, 'utf8');
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			return typeof parsed === 'object' && parsed !== null ? parsed : {};
		} catch {
			return {};
		}
	}

	private async writeStorage(extensionId: string, data: Record<string, unknown>): Promise<void> {
		const dirPath = this.getStorageDir(extensionId);
		await fsPromises.mkdir(dirPath, { recursive: true });
		await fsPromises.writeFile(this.getStorageFile(extensionId), JSON.stringify(data, null, 2), 'utf8');
	}

	private async getStorageValue(extensionId: string, key: string): Promise<unknown | null> {
		const data = await this.readStorage(extensionId);
		return key in data ? data[key] : null;
	}

	private async setStorageValue(extensionId: string, key: string, value: unknown) {
		const data = await this.readStorage(extensionId);
		data[key] = value;
		await this.writeStorage(extensionId, data);
		return { key, value };
	}

	private async deleteStorageValue(extensionId: string, key: string): Promise<void> {
		const data = await this.readStorage(extensionId);
		delete data[key];
		if (Object.keys(data).length === 0) {
			const filePath = this.getStorageFile(extensionId);
			if (fs.existsSync(filePath)) {
				await fsPromises.rm(this.getStorageDir(extensionId), { recursive: true, force: true });
			}
			return;
		}
		await this.writeStorage(extensionId, data);
	}
}
