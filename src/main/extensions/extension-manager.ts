import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
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
} from '../../../packages/openwriter-extension-types/src/index';
import { ExtensionChannels } from '../../shared/channels';

interface ManagedExtensionRecord {
	manifest: ExtensionInfo;
	state: ExtensionRuntimeState;
	host: ExtensionHostLauncher | null;
	readyDeferred: Deferred<void> | null;
	activationDeferred: Deferred<void> | null;
	pendingCommandResults: Map<string, Deferred<ExtensionCommandExecutionResult>>;
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
			});
		}

		this.broadcastRegistryChanged();
	}

	listExtensions(): ExtensionRuntimeInfo[] {
		return Array.from(this.records.values())
			.map((record) => ({
				...record.manifest,
				runtime: { ...record.state, registeredCommands: [...record.state.registeredCommands] },
			}))
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	getRuntimeState(extensionId: string): ExtensionRuntimeState {
		const record = this.getRecord(extensionId);
		return { ...record.state, registeredCommands: [...record.state.registeredCommands] };
	}

	getCommands(windowId?: number, query: ExtensionCommandQuery = {}): ExtensionCommandInfo[] {
		const activeDocumentId = this.getActiveDocumentId(windowId);

		return Array.from(this.records.values())
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

		await this.ensureActivated(record, context.reason, context);

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
	}

	async reload(extensionId: string): Promise<void> {
		await this.stopRecord(this.getRecord(extensionId));
		await this.discover();

		const record = this.getRecord(extensionId);
		if (record.manifest.enabled && record.manifest.activationEvents.includes('onStartup')) {
			await this.ensureActivated(record, 'startup');
		}

		this.broadcastRuntimeChanged(extensionId);
	}

	setActiveDocument(windowId: number, documentId: string | null): void {
		this.activeDocumentsByWindow.set(windowId, documentId);

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
					void this.ensureActivated(record, 'workspace-opened');
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
				record.state.lastError = code === 0 ? record.state.lastError : `Extension host exited with code ${code}.`;
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
				record.state.registeredCommands = [];
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
			case 'command.result': {
				const pending = record.pendingCommandResults.get(message.payload.requestId);
				if (!pending) break;
				record.pendingCommandResults.delete(message.payload.requestId);
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
				record.activationDeferred?.reject(new Error(message.payload.error));
				record.activationDeferred = null;
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
		if (!record.host || record.state.status === 'invalid') return;

		try {
			await this.ensureHost(record);
			record.host?.send({
				kind: 'event.dispatch',
				payload: {
					eventType,
					payload: payload as never,
					context,
				},
			});
		} catch (error) {
			this.options.logger.warn(
				'ExtensionManager',
				`Failed to dispatch ${eventType} to ${record.manifest.id}`,
				error
			);
		}
	}

	private async stopRecord(record: ManagedExtensionRecord): Promise<void> {
		if (!record.host) return;
		record.host.destroy();
		record.host = null;
		record.readyDeferred = null;
		record.activationDeferred = null;
		record.pendingCommandResults.clear();
		record.state.activated = false;
		record.state.pid = undefined;
		record.state.registeredCommands = [];
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
}
