import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';
import type { Disposable, ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import type { StoreService } from '../services/store';
import type { TaskExecutor } from '../task/task-executor';
import type { WindowContextManager } from '../core/window-context';
import { ExtensionApiGateway } from './extension-api-gateway';
import { ExtensionHostLauncher } from './extension-host-launcher';
import { parseExtensionManifest } from '../../../packages/openwriter-extension-manifest/src/index';
import {
	type ExtensionCommandExecutionResult,
	type ExtensionCommandInfo,
	type ExtensionCommandQuery,
	type ExtensionDocPanelContent,
	type ExtensionDocPanelContentChangedPayload,
	type ExtensionDocumentContextSnapshot,
	type ExtensionDocPanelInfo,
	type ExtensionDocPanelsChangedPayload,
	type ExtensionEventType,
	type ExtensionHostToMainMessage,
	type ExtensionInfo,
	type ExtensionRegistrySnapshot,
	type ExtensionRuntimeInfo,
	type ExtensionRuntimeChangedPayload,
	type ExtensionRuntimeState,
	type ExtensionTaskEvent,
	type MainToExtensionHostMessage,
	type ExtensionExecutionContext,
	type ExtensionDocPanelRenderReason,
	extensionDocPanelId,
	parseExtensionDocPanelId,
} from '../../../packages/openwriter-extension-types/src/index';
import { ExtensionChannels } from '../../shared/channels';

interface ManagedExtensionRecord {
	manifest: ExtensionInfo;
	state: ExtensionRuntimeState;
	host: ExtensionHostLauncher | null;
	readyDeferred: Deferred<void> | null;
	activationDeferred: Deferred<void> | null;
	pendingCommandResults: Map<string, Deferred<ExtensionCommandExecutionResult>>;
	pendingDocPanelResults: Map<string, Deferred<ExtensionDocPanelContent>>;
}

interface DocumentContextEntry {
	documentId: string;
	context: ExtensionDocumentContextSnapshot;
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: Error) => void;
}

function createDeferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

export interface ExtensionManagerOptions {
	container: ServiceContainer;
	eventBus: EventBus;
	logger: LoggerService;
	store: StoreService;
	windowContextManager: WindowContextManager;
	taskExecutor: TaskExecutor;
	hostEntryPath: string;
}

export class ExtensionManager implements Disposable {
	private readonly records = new Map<string, ManagedExtensionRecord>();
	private readonly activeDocumentsByWindow = new Map<number, string | null>();
	private readonly documentContextsByWindow = new Map<number, DocumentContextEntry>();
	private readonly gateway: ExtensionApiGateway;
	private initialized = false;
	private subscriptionsBound = false;

	constructor(private readonly options: ExtensionManagerOptions) {
		this.gateway = new ExtensionApiGateway({
			container: options.container,
			eventBus: options.eventBus,
			logger: options.logger,
			windowContextManager: options.windowContextManager,
			taskExecutor: options.taskExecutor,
			getActiveDocumentId: (windowId?: number) => this.getActiveDocumentId(windowId),
			getDocumentContext: (documentId: string, windowId?: number) =>
				this.getDocumentContext(documentId, windowId),
		});
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;
		await fsPromises.mkdir(this.getUserExtensionsDirectory(), { recursive: true });
		await this.discover();
		this.bindCoreSubscriptions();
		this.initialized = true;
		await this.activateStartupExtensions();
	}

	async discover(): Promise<void> {
		const discovered = new Map<string, ExtensionInfo>();
		for (const source of ['bundled', 'user'] as const) {
			const directory =
				source === 'bundled' ? this.getBundledExtensionsDirectory() : this.getUserExtensionsDirectory();
			const extensions = await this.readExtensionsFromDirectory(directory, source);
			for (const extension of extensions) {
				discovered.set(extension.id, extension);
			}
		}

		for (const record of this.records.values()) {
			if (!discovered.has(record.manifest.id)) {
				this.stopRecord(record);
				this.records.delete(record.manifest.id);
			}
		}

		for (const extension of discovered.values()) {
			const existing = this.records.get(extension.id);
			if (existing) {
				existing.manifest = extension;
				if (extension.validationErrors.length > 0) {
					existing.state = this.createInitialState(extension);
					this.stopRecord(existing);
				}
				continue;
			}

			this.records.set(extension.id, {
				manifest: extension,
				state: this.createInitialState(extension),
				host: null,
				readyDeferred: null,
				activationDeferred: null,
				pendingCommandResults: new Map(),
				pendingDocPanelResults: new Map(),
			});
		}

		this.broadcastRegistryChanged();
		this.broadcastDocPanelsChanged();
	}

	listExtensions(): ExtensionRuntimeInfo[] {
		return Array.from(this.records.values())
			.map((record) => ({
				...record.manifest,
				runtime: {
					...record.state,
					registeredCommands: [...record.state.registeredCommands],
					registeredDocPanels: [...record.state.registeredDocPanels],
				},
			}))
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	getRuntimeState(extensionId: string): ExtensionRuntimeState {
		const record = this.getRecord(extensionId);
		return {
			...record.state,
			registeredCommands: [...record.state.registeredCommands],
			registeredDocPanels: [...record.state.registeredDocPanels],
		};
	}

	getCommands(windowId?: number, query: ExtensionCommandQuery = {}): ExtensionCommandInfo[] {
		const activeDocumentId = this.getActiveDocumentId(windowId);

		return Array.from(this.records.values())
			.filter((record) => record.manifest.validationErrors.length === 0)
			.filter((record) => query.includeDisabled || record.manifest.enabled)
			.flatMap((record) =>
				record.manifest.commands
					.filter((command) => command.when !== 'document' || Boolean(activeDocumentId))
					.map((command) => ({
						...command,
						extensionId: record.manifest.id,
						extensionName: record.manifest.name,
						enabled: record.manifest.enabled,
					}))
			)
			.sort((left, right) => left.title.localeCompare(right.title));
	}

	getDocPanels(_windowId?: number, documentId?: string | null): ExtensionDocPanelInfo[] {
		if (!documentId) return [];

		return Array.from(this.records.values())
			.filter((record) => record.manifest.enabled)
			.filter((record) => record.manifest.validationErrors.length === 0)
			.flatMap((record) =>
				record.manifest.docPanels.map((panel) => ({
					...panel,
					id: extensionDocPanelId(record.manifest.id, panel.id),
					localId: panel.id,
					extensionId: record.manifest.id,
					extensionName: record.manifest.name,
					enabled: record.manifest.enabled,
					iconAssetUri:
						panel.icon && typeof panel.icon !== 'string'
							? this.resolveExtensionAssetUri(record.manifest.extensionPath, panel.icon.path)
							: undefined,
				}))
			)
			.sort((left, right) => {
				const orderDiff = (left.order ?? 0) - (right.order ?? 0);
				return orderDiff !== 0 ? orderDiff : left.title.localeCompare(right.title);
			});
	}

	async getDocPanelContent(
		panelId: string,
		documentId: string,
		windowId?: number,
		reason: ExtensionDocPanelRenderReason = 'open'
	): Promise<ExtensionDocPanelContent> {
		const resolved = parseExtensionDocPanelId(panelId);
		if (!resolved) {
			throw new Error(`Unknown doc panel "${panelId}".`);
		}

		const record = this.getRecord(resolved.extensionId);
		if (!record.manifest.enabled) {
			throw new Error(`Extension "${record.manifest.name}" is disabled.`);
		}
		if (record.manifest.validationErrors.length > 0) {
			throw new Error(`Extension "${record.manifest.name}" failed validation and cannot run.`);
		}
		if (!record.manifest.docPanels.some((panel) => panel.id === resolved.panelId)) {
			throw new Error(`Doc panel "${panelId}" is not contributed by "${record.manifest.name}".`);
		}

		const context: ExtensionExecutionContext = {
			windowId,
			documentId,
			reason: `doc-panel:${resolved.panelId}:${reason}`,
		};
		await this.ensureActivated(record, context.reason ?? `doc-panel:${resolved.panelId}:${reason}`, context);

		const requestId = randomUUID();
		const deferred = createDeferred<ExtensionDocPanelContent>();
		record.pendingDocPanelResults.set(requestId, deferred);

		record.host?.send({
			kind: 'doc-panel.render',
			payload: {
				requestId,
				panelId: resolved.panelId,
				context: {
					panelId: resolved.panelId,
					documentId,
					windowId,
					reason,
					documentContext: this.getDocumentContext(documentId, windowId),
				},
			},
		});

		return deferred.promise;
	}

	async executeCommand(
		commandId: string,
		payload: unknown,
		windowId?: number
	): Promise<ExtensionCommandExecutionResult> {
		const record = this.findRecordByCommand(commandId);
		if (!record) {
			throw new Error(`Unknown extension command "${commandId}".`);
		}
		if (!record.manifest.enabled) {
			throw new Error(`Extension "${record.manifest.name}" is disabled.`);
		}
		if (record.manifest.validationErrors.length > 0) {
			throw new Error(`Extension "${record.manifest.name}" failed validation and cannot run.`);
		}

		const context: ExtensionExecutionContext = {
			windowId,
			documentId: this.getActiveDocumentId(windowId),
			reason: `command:${commandId}`,
		};
		const activationReason = context.reason ?? `command:${commandId}`;

		await this.ensureActivated(record, activationReason, context);

		const requestId = randomUUID();
		const deferred = createDeferred<ExtensionCommandExecutionResult>();
		record.pendingCommandResults.set(requestId, deferred);

		record.host?.send({
			kind: 'command.execute',
			payload: {
				requestId,
				commandId,
				payload,
				context,
			},
		});

		return deferred.promise;
	}

	async setEnabled(extensionId: string, enabled: boolean): Promise<void> {
		const record = this.getRecord(extensionId);
		record.manifest.enabled = enabled;
		this.options.store.setExtensionEnabled(extensionId, enabled);

		if (!enabled) {
			await this.stopRecord(record);
			record.state = this.createInitialState(record.manifest);
			record.state.status = 'stopped';
		} else if (record.manifest.activationEvents.includes('onStartup')) {
			await this.ensureActivated(record, 'startup');
		}

		this.broadcastRegistryChanged();
		this.broadcastRuntimeChanged(extensionId);
		this.broadcastDocPanelsChanged();
	}

	async reload(extensionId: string): Promise<void> {
		await this.stopRecord(this.getRecord(extensionId));
		await this.discover();

		const record = this.getRecord(extensionId);
		if (record.manifest.enabled && record.manifest.activationEvents.includes('onStartup')) {
			await this.ensureActivated(record, 'startup');
		}

		this.broadcastRuntimeChanged(extensionId);
		this.broadcastDocPanelsChanged();
	}

	setActiveDocument(windowId: number, documentId: string | null): void {
		this.activeDocumentsByWindow.set(windowId, documentId);
		const currentContext = this.documentContextsByWindow.get(windowId);
		if (!documentId || currentContext?.documentId !== documentId) {
			this.documentContextsByWindow.delete(windowId);
		}

		this.broadcastDocPanelsChanged(windowId, documentId);

		if (!documentId) return;

		for (const record of this.records.values()) {
			if (!record.manifest.enabled) continue;
			if (!record.manifest.activationEvents.includes('onDocumentOpened')) continue;

			void this.ensureActivated(record, 'document-opened', {
				windowId,
				documentId,
				reason: 'document-opened',
			});
		}
	}

	setDocumentContext(
		windowId: number,
		documentId: string,
		context: ExtensionDocumentContextSnapshot
	): void {
		const previous = this.documentContextsByWindow.get(windowId)?.context;
		this.documentContextsByWindow.set(windowId, {
			documentId,
			context,
		});

		const changedKeys: Array<'markdown' | 'selection' | 'editorState'> = [];
		if (!previous || previous.markdown !== context.markdown) {
			changedKeys.push('markdown');
		}

		if (JSON.stringify(previous?.selection ?? null) !== JSON.stringify(context.selection)) {
			changedKeys.push('selection');
		}

		if (JSON.stringify(previous?.editorState ?? null) !== JSON.stringify(context.editorState)) {
			changedKeys.push('editorState');
		}

		if (changedKeys.length === 0) return;
		this.broadcastDocPanelContentChanged(documentId, windowId, 'context', changedKeys);
	}

	getUserExtensionsDirectory(): string {
		return path.join(app.getPath('userData'), 'extensions');
	}

	getBundledExtensionsDirectory(): string {
		return app.isPackaged
			? path.join(process.resourcesPath, 'extensions')
			: path.join(app.getAppPath(), 'extensions');
	}

	destroy(): void {
		for (const record of this.records.values()) {
			this.stopRecord(record);
		}
		this.records.clear();
	}

	private bindCoreSubscriptions(): void {
		if (this.subscriptionsBound) return;
		this.subscriptionsBound = true;

		this.options.eventBus.on('workspace:changed', (event) => {
			const payload = event.payload as {
				currentPath: string | null;
				previousPath: string | null;
			};

			for (const record of this.records.values()) {
				if (!record.manifest.enabled) continue;
				if (record.manifest.activationEvents.includes('onWorkspaceOpened')) {
					void this.ensureActivated(record, 'workspace-opened').then(() => {
						void this.dispatchEvent(record, 'workspace.changed', payload);
					});
					continue;
				}
				void this.dispatchEvent(record, 'workspace.changed', payload);
			}
		});

		this.options.eventBus.on('document:changed', (event) => {
			const payload = event.payload as {
				windowId?: number;
				document: {
					id: string;
					title: string;
					content: string;
					path: string;
					windowId?: number;
				};
			};

			for (const record of this.records.values()) {
				if (!record.manifest.enabled) continue;
				void this.dispatchEvent(record, 'document.changed', payload, {
					windowId: payload.windowId,
					documentId: payload.document.id,
					reason: 'document-changed',
				});
			}

			this.broadcastDocPanelContentChanged(payload.document.id, payload.windowId, 'document');
		});

		const forwardTaskEvent = (payload: ExtensionTaskEvent): void => {
			for (const record of this.records.values()) {
				if (!record.manifest.enabled) continue;
				if (!record.manifest.permissions.includes('task.observe')) continue;
				void this.dispatchEvent(record, 'task.event', payload, {
					windowId: payload.windowId,
					reason: 'task-event',
				});
			}
		};

		this.options.eventBus.on('task:submitted', (event) => {
			const payload = event.payload as {
				taskId: string;
				taskType: string;
				windowId?: number;
			};
			forwardTaskEvent({
				taskId: payload.taskId,
				taskType: payload.taskType,
				state: 'submitted',
				windowId: payload.windowId,
			});
		});
		this.options.eventBus.on('task:started', (event) => {
			const payload = event.payload as {
				taskId: string;
				taskType: string;
				windowId?: number;
			};
			forwardTaskEvent({
				taskId: payload.taskId,
				taskType: payload.taskType,
				state: 'started',
				windowId: payload.windowId,
			});
		});
		this.options.eventBus.on('task:completed', (event) => {
			const payload = event.payload as {
				taskId: string;
				taskType: string;
				windowId?: number;
				result: unknown;
				durationMs: number;
			};
			forwardTaskEvent({
				taskId: payload.taskId,
				taskType: payload.taskType,
				state: 'completed',
				windowId: payload.windowId,
				result: payload.result,
				durationMs: payload.durationMs,
			});
		});
		this.options.eventBus.on('task:failed', (event) => {
			const payload = event.payload as {
				taskId: string;
				taskType: string;
				windowId?: number;
				error: string;
			};
			forwardTaskEvent({
				taskId: payload.taskId,
				taskType: payload.taskType,
				state: 'failed',
				windowId: payload.windowId,
				error: payload.error,
			});
		});
		this.options.eventBus.on('task:cancelled', (event) => {
			const payload = event.payload as {
				taskId: string;
				taskType: string;
				windowId?: number;
			};
			forwardTaskEvent({
				taskId: payload.taskId,
				taskType: payload.taskType,
				state: 'cancelled',
				windowId: payload.windowId,
			});
		});
	}

	private getRecord(extensionId: string): ManagedExtensionRecord {
		const record = this.records.get(extensionId);
		if (!record) {
			throw new Error(`Unknown extension "${extensionId}".`);
		}
		return record;
	}

	private findRecordByCommand(commandId: string): ManagedExtensionRecord | null {
		for (const record of this.records.values()) {
			if (record.manifest.commands.some((command) => command.id === commandId)) {
				return record;
			}
		}
		return null;
	}

	private createInitialState(manifest: ExtensionInfo): ExtensionRuntimeState {
		return {
			status: manifest.validationErrors.length > 0 ? 'invalid' : 'idle',
			activated: false,
			pid: undefined,
			startedAt: undefined,
			lastError: manifest.validationErrors[0],
			crashCount: 0,
			registeredCommands: [],
			registeredDocPanels: [],
		};
	}

	private async readExtensionsFromDirectory(
		directoryPath: string,
		source: ExtensionInfo['source']
	): Promise<ExtensionInfo[]> {
		if (!fs.existsSync(directoryPath)) return [];

		const entries = await fsPromises.readdir(directoryPath, { withFileTypes: true });
		const discovered: ExtensionInfo[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const extensionPath = path.join(directoryPath, entry.name);
			const manifestPath = path.join(extensionPath, 'openwriter.extension.json');
			if (!fs.existsSync(manifestPath)) continue;

			const raw = await fsPromises.readFile(manifestPath, 'utf8');
			const { manifest, errors } = parseExtensionManifest(raw);

			if (manifest.main) {
				const entryPath = path.join(extensionPath, manifest.main);
				if (!fs.existsSync(entryPath)) {
					errors.push(`Entry file "${manifest.main}" was not found.`);
				}
			}

			const enabled = this.options.store.getExtensionEnabled(
				manifest.id,
				manifest.defaultEnabled ?? true
			);

			discovered.push({
				id: manifest.id || entry.name,
				name: manifest.name || entry.name,
				version: manifest.version,
				apiVersion: manifest.apiVersion,
				main: manifest.main,
				description: manifest.description,
				author: manifest.author,
				source,
				extensionPath,
				manifestPath,
				enabled,
				capabilities: manifest.capabilities ?? [],
				permissions: manifest.permissions ?? [],
				activationEvents: manifest.activationEvents ?? [],
				commands: manifest.contributes?.commands ?? [],
				docPanels: manifest.contributes?.docPanels ?? [],
				docPages: manifest.contributes?.docPages ?? [],
				validationErrors: errors,
			});
		}

		return discovered;
	}

	private async activateStartupExtensions(): Promise<void> {
		for (const record of this.records.values()) {
			if (!record.manifest.enabled) continue;
			if (record.manifest.validationErrors.length > 0) continue;
			if (record.manifest.activationEvents.includes('onStartup')) {
				await this.ensureActivated(record, 'startup');
			}
		}
	}

	private async ensureActivated(
		record: ManagedExtensionRecord,
		reason: string,
		context?: ExtensionExecutionContext
	): Promise<void> {
		if (record.state.activated) return;
		await this.ensureHost(record);
		if (record.state.activated) return;
		if (record.activationDeferred) return record.activationDeferred.promise;

		const deferred = createDeferred<void>();
		record.activationDeferred = deferred;
		record.host?.send({
			kind: 'activate',
			payload: { reason, context },
		});
		return deferred.promise;
	}

	private async ensureHost(record: ManagedExtensionRecord): Promise<void> {
		if (record.host) {
			return record.readyDeferred?.promise ?? Promise.resolve();
		}

		record.readyDeferred = createDeferred<void>();
		record.state.status = 'starting';
		record.state.lastError = undefined;
		this.broadcastRuntimeChanged(record.manifest.id);

		const host = new ExtensionHostLauncher({
			extensionId: record.manifest.id,
			hostEntryPath: this.options.hostEntryPath,
			logger: this.options.logger,
			onMessage: (message) => {
				void this.handleHostMessage(record, message);
			},
			onExit: (code) => {
				record.host = null;
				record.state.status = code === 0 ? 'stopped' : 'crashed';
				record.state.activated = false;
				record.state.pid = undefined;
				record.state.crashCount += code === 0 ? 0 : 1;
				record.state.lastError =
					code === 0 ? record.state.lastError : `Extension host exited with code ${code}.`;
				record.readyDeferred?.reject(new Error(record.state.lastError ?? 'Extension host exited.'));
				record.readyDeferred = null;
				record.activationDeferred?.reject(
					new Error(record.state.lastError ?? 'Extension activation interrupted.')
				);
				record.activationDeferred = null;
				for (const pending of record.pendingCommandResults.values()) {
					pending.reject(new Error(record.state.lastError ?? 'Extension host exited.'));
				}
				record.pendingCommandResults.clear();
				for (const pending of record.pendingDocPanelResults.values()) {
					pending.reject(new Error(record.state.lastError ?? 'Extension host exited.'));
				}
				record.pendingDocPanelResults.clear();
				record.state.registeredCommands = [];
				record.state.registeredDocPanels = [];
				this.broadcastRuntimeChanged(record.manifest.id);
			},
		});

		record.host = host;
		await host.start();
		record.state.pid = host.pid;
		record.state.startedAt = Date.now();
		record.state.status = 'starting';
		host.send({
			kind: 'bootstrap',
			payload: {
				manifest: {
					id: record.manifest.id,
					name: record.manifest.name,
					version: record.manifest.version,
					apiVersion: record.manifest.apiVersion,
					main: record.manifest.main,
					description: record.manifest.description,
					author: record.manifest.author,
					defaultEnabled: record.manifest.enabled,
					capabilities: record.manifest.capabilities,
					permissions: record.manifest.permissions,
					activationEvents: record.manifest.activationEvents,
					contributes: {
						commands: record.manifest.commands,
						docPanels: record.manifest.docPanels,
						docPages: record.manifest.docPages,
					},
				},
				extensionPath: record.manifest.extensionPath,
			},
		} as MainToExtensionHostMessage);
		await record.readyDeferred.promise;
	}

	private async handleHostMessage(
		record: ManagedExtensionRecord,
		message: ExtensionHostToMainMessage
	): Promise<void> {
		switch (message.kind) {
			case 'ready':
				record.state.status = 'running';
				record.readyDeferred?.resolve();
				record.readyDeferred = null;
				this.broadcastRuntimeChanged(record.manifest.id);
				break;
			case 'activated':
				record.state.activated = true;
				record.state.status = 'running';
				record.activationDeferred?.resolve();
				record.activationDeferred = null;
				this.broadcastRuntimeChanged(record.manifest.id);
				break;
			case 'deactivated':
				record.state.activated = false;
				record.state.status = 'stopped';
				record.activationDeferred = null;
				this.broadcastRuntimeChanged(record.manifest.id);
				break;
			case 'command.registered':
				if (!record.state.registeredCommands.includes(message.payload.id)) {
					record.state.registeredCommands = [...record.state.registeredCommands, message.payload.id];
					this.broadcastRuntimeChanged(record.manifest.id);
				}
				break;
			case 'doc-panel.registered': {
				const runtimeId = extensionDocPanelId(record.manifest.id, message.payload.id);
				if (!record.state.registeredDocPanels.includes(runtimeId)) {
					record.state.registeredDocPanels = [...record.state.registeredDocPanels, runtimeId];
					this.broadcastRuntimeChanged(record.manifest.id);
				}
				break;
			}
			case 'command.result': {
				const pending = record.pendingCommandResults.get(message.payload.requestId);
				if (!pending) break;
				record.pendingCommandResults.delete(message.payload.requestId);
				pending.resolve(message.payload.result);
				break;
			}
			case 'doc-panel.result': {
				const pending = record.pendingDocPanelResults.get(message.payload.requestId);
				if (!pending) break;
				record.pendingDocPanelResults.delete(message.payload.requestId);
				pending.resolve(message.payload.result);
				break;
			}
			case 'host.call': {
				try {
					const result = await this.gateway.handle(
						record.manifest,
						message.payload.method,
						message.payload.args as never,
						message.payload.context
					);
					record.host?.send({
						kind: 'host.result',
						payload: {
							requestId: message.payload.requestId,
							success: true,
							result,
						},
					});
				} catch (error) {
					record.host?.send({
						kind: 'host.result',
						payload: {
							requestId: message.payload.requestId,
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
					});
				}
				break;
			}
			case 'error':
				record.state.lastError = message.payload.error;
				if (message.payload.requestId) {
					const pendingDocPanel = record.pendingDocPanelResults.get(message.payload.requestId);
					if (pendingDocPanel) {
						record.pendingDocPanelResults.delete(message.payload.requestId);
						pendingDocPanel.reject(new Error(message.payload.error));
					}
				}
				if (!message.payload.requestId) {
					record.activationDeferred?.reject(new Error(message.payload.error));
					record.activationDeferred = null;
				}
				this.broadcastRuntimeChanged(record.manifest.id);
				break;
			case 'log':
				this.options.logger[message.payload.level](
					`Extension:${record.manifest.id}`,
					message.payload.message,
					message.payload.data
				);
				break;
		}
	}

	private async dispatchEvent(
		record: ManagedExtensionRecord,
		eventType: ExtensionEventType,
		payload: unknown,
		context?: ExtensionExecutionContext
	): Promise<void> {
		if (!record.host || record.state.status === 'invalid' || !record.state.activated) return;

		record.host.send({
			kind: 'event.dispatch',
			payload: {
				eventType,
				payload: payload as never,
				context,
			},
		});
	}

	private async stopRecord(record: ManagedExtensionRecord): Promise<void> {
		if (!record.host) return;
		record.host.destroy();
		record.host = null;
		record.readyDeferred = null;
		record.activationDeferred = null;
		record.pendingCommandResults.clear();
		record.pendingDocPanelResults.clear();
		record.state.activated = false;
		record.state.pid = undefined;
		record.state.registeredCommands = [];
		record.state.registeredDocPanels = [];
	}

	private getActiveDocumentId(windowId?: number): string | null {
		if (windowId !== undefined && this.activeDocumentsByWindow.has(windowId)) {
			return this.activeDocumentsByWindow.get(windowId) ?? null;
		}

		for (const value of this.activeDocumentsByWindow.values()) {
			if (value) return value;
		}
		return null;
	}

	private getDocumentContext(
		documentId: string,
		windowId?: number
	): ExtensionDocumentContextSnapshot | null {
		if (windowId !== undefined) {
			const byWindow = this.documentContextsByWindow.get(windowId);
			if (byWindow?.documentId === documentId) {
				return byWindow.context;
			}
		}

		for (const entry of this.documentContextsByWindow.values()) {
			if (entry.documentId === documentId) {
				return entry.context;
			}
		}

		return null;
	}

	private resolveExtensionAssetUri(extensionPath: string, assetPath: string): string {
		return pathToFileURL(path.join(extensionPath, assetPath)).href;
	}

	private broadcastRegistryChanged(): void {
		const payload: ExtensionRegistrySnapshot = {
			extensions: this.listExtensions(),
		};
		this.options.eventBus.broadcast(ExtensionChannels.registryChanged, payload);
	}

	private broadcastRuntimeChanged(extensionId: string): void {
		const payload: ExtensionRuntimeChangedPayload = {
			extensionId,
			state: this.getRuntimeState(extensionId),
		};
		this.options.eventBus.broadcast(ExtensionChannels.runtimeChanged, payload);
	}

	private broadcastDocPanelsChanged(windowId?: number, documentId?: string | null): void {
		const payload: ExtensionDocPanelsChangedPayload = {
			windowId,
			documentId,
		};
		this.options.eventBus.broadcast(ExtensionChannels.docPanelsChanged, payload);
	}

	private broadcastDocPanelContentChanged(
		documentId: string,
		windowId?: number,
		reason?: 'document' | 'context',
		changedKeys?: Array<'markdown' | 'selection' | 'editorState'>
	): void {
		const payload: ExtensionDocPanelContentChangedPayload = {
			documentId,
			windowId,
			reason,
			changedKeys,
		};
		this.options.eventBus.broadcast(ExtensionChannels.docPanelContentChanged, payload);
	}
}
