import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
	ExtensionContext,
	ExtensionDocPanelRegistration,
	ExtensionModule,
} from '../../openwriter-extension-sdk/src/index';
import type {
	ExtensionDocumentChangedEvent,
	ExtensionDocPanelContent,
	ExtensionDocPanelRenderContext,
	ExtensionEventPayloadMap,
	ExtensionExecutionContext,
	ExtensionHostRequestMap,
	ExtensionManifest,
	ExtensionTaskEvent,
	ExtensionWorkspaceChangedEvent,
	ExtensionHostToMainMessage,
	MainToExtensionHostMessage,
} from '../../openwriter-extension-types/src/index';

type PendingHostCall = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

class ExtensionHostRuntime {
	private manifest: ExtensionManifest | null = null;
	private module: ExtensionModule | null = null;
	private activated = false;
	private readonly commandHandlers = new Map<string, (payload?: unknown) => Promise<unknown> | unknown>();
	private readonly docPanelRenderers = new Map<
		string,
		ExtensionDocPanelRegistration['render']
	>();
	private readonly workspaceListeners = new Set<
		(event: ExtensionWorkspaceChangedEvent) => void | Promise<void>
	>();
	private readonly documentListeners = new Set<
		(event: ExtensionDocumentChangedEvent['document']) => void | Promise<void>
	>();
	private readonly taskListeners = new Set<(event: ExtensionTaskEvent) => void | Promise<void>>();
	private readonly pendingHostCalls = new Map<string, PendingHostCall>();
	private readonly invocationContext = new AsyncLocalStorage<ExtensionExecutionContext | undefined>();

	async handleMessage(message: MainToExtensionHostMessage): Promise<void> {
		switch (message.kind) {
			case 'bootstrap':
				await this.bootstrap(message.payload.manifest, message.payload.extensionPath);
				break;
			case 'activate':
				await this.activate(message.payload.reason, message.payload.context);
				break;
			case 'deactivate':
				await this.deactivate();
				break;
			case 'command.execute':
				await this.executeCommand(
					message.payload.requestId,
					message.payload.commandId,
					message.payload.payload,
					message.payload.context
				);
				break;
			case 'doc-panel.render':
				await this.renderDocPanel(
					message.payload.requestId,
					message.payload.panelId,
					message.payload.context
				);
				break;
			case 'event.dispatch':
				await this.dispatchEvent(message.payload.eventType, message.payload.payload, message.payload.context);
				break;
			case 'host.result':
				this.resolveHostCall(
					message.payload.requestId,
					message.payload.success,
					message.payload.result,
					message.payload.error
				);
				break;
		}
	}

	private async bootstrap(manifest: ExtensionManifest, extensionPath: string): Promise<void> {
		this.manifest = manifest;

		const moduleUrl = pathToFileURL(path.join(extensionPath, manifest.main)).href;
		const loaded = (await import(moduleUrl)) as { default?: ExtensionModule };
		const extensionModule = loaded.default;
		if (!extensionModule || typeof extensionModule.activate !== 'function') {
			throw new Error(`Extension "${manifest.id}" does not export a default module with activate().`);
		}

		this.module = extensionModule;
		this.send({ kind: 'ready' });
	}

	private async activate(reason: string, context?: ExtensionExecutionContext): Promise<void> {
		if (!this.module || !this.manifest) {
			throw new Error('Extension bootstrap has not completed.');
		}
		if (this.activated) {
			this.send({ kind: 'activated', payload: { activated: true } });
			return;
		}

		const extensionContext = this.createContext();
		await this.invocationContext.run(context, async () => {
			await this.module?.activate(extensionContext);
		});
		this.activated = true;
		this.send({ kind: 'activated', payload: { activated: true } });
		this.log('info', `Activated`, { reason });
	}

	private async deactivate(): Promise<void> {
		if (!this.module) {
			this.send({ kind: 'deactivated', payload: { activated: false } });
			return;
		}

		if (this.activated && typeof this.module.deactivate === 'function') {
			await this.module.deactivate();
		}

		this.activated = false;
		this.commandHandlers.clear();
		this.docPanelRenderers.clear();
		this.workspaceListeners.clear();
		this.documentListeners.clear();
		this.taskListeners.clear();
		this.send({ kind: 'deactivated', payload: { activated: false } });
	}

	private createContext(): ExtensionContext {
		if (!this.manifest) {
			throw new Error('Manifest unavailable.');
		}

		const callHost = async <TMethod extends keyof ExtensionHostRequestMap>(
			method: TMethod,
			...args: ExtensionHostRequestMap[TMethod]['args']
		): Promise<ExtensionHostRequestMap[TMethod]['result']> => {
			const requestId = randomUUID();
			const currentContext = this.invocationContext.getStore();
			const promise = new Promise<unknown>((resolve, reject) => {
				this.pendingHostCalls.set(requestId, { resolve, reject });
			});

			this.send({
				kind: 'host.call',
				payload: {
					requestId,
					method,
					args,
					context: currentContext,
				},
			});

			return (await promise) as ExtensionHostRequestMap[TMethod]['result'];
		};

		return {
			manifest: this.manifest,
			commands: {
				register: (command) => {
					this.commandHandlers.set(command.id, command.run);
					this.send({ kind: 'command.registered', payload: { id: command.id } });
					return () => {
						this.commandHandlers.delete(command.id);
					};
				},
			},
			panels: {
				registerDocPanel: (panel) => {
					this.docPanelRenderers.set(panel.id, panel.render);
					this.send({ kind: 'doc-panel.registered', payload: { id: panel.id } });
					return () => {
						this.docPanelRenderers.delete(panel.id);
					};
				},
			},
			events: {
				onWorkspaceChanged: (listener) => {
					this.workspaceListeners.add(listener);
					return () => {
						this.workspaceListeners.delete(listener);
					};
				},
				onDocumentChanged: (listener) => {
					this.documentListeners.add(listener);
					return () => {
						this.documentListeners.delete(listener);
					};
				},
				onTaskEvent: (listener) => {
					this.taskListeners.add(listener);
					return () => {
						this.taskListeners.delete(listener);
					};
				},
			},
			host: {
				app: {
					getInfo: () => callHost('app.getInfo'),
				},
				workspace: {
					getCurrent: () => callHost('workspace.getCurrent'),
				},
				documents: {
					getActive: () => callHost('documents.getActive'),
					getById: (documentId) => callHost('documents.getById', documentId),
					getContext: (documentId) => callHost('documents.getContext', documentId),
					update: (documentId, patch) => callHost('documents.update', documentId, patch),
				},
				tasks: {
					submit: (submission) => callHost('tasks.submit', submission),
				},
			},
			storage: {
				get: <T = unknown>(key: string) => callHost('storage.get', key) as Promise<T | null>,
				set: async <T = unknown>(key: string, value: T) => {
					await callHost('storage.set', key, value);
					return value;
				},
				delete: (key: string) => callHost('storage.delete', key),
			},
			log: {
				info: (message, data) => this.log('info', message, data),
				warn: (message, data) => this.log('warn', message, data),
				error: (message, data) => this.log('error', message, data),
			},
		};
	}

	private async executeCommand(
		requestId: string,
		commandId: string,
		payload: unknown,
		context?: ExtensionExecutionContext
	): Promise<void> {
		try {
			if (!this.activated) {
				await this.activate('command', context);
			}

			const handler = this.commandHandlers.get(commandId);
			if (!handler) {
				throw new Error(`Command "${commandId}" is not registered by the extension runtime.`);
			}

			const data = await this.invocationContext.run(context, async () => handler(payload));
			this.send({
				kind: 'command.result',
				payload: {
					requestId,
					result: {
						ok: true,
						data,
					},
				},
			});
		} catch (error) {
			this.send({
				kind: 'command.result',
				payload: {
					requestId,
					result: {
						ok: false,
						error: error instanceof Error ? error.message : String(error),
					},
				},
			});
		}
	}

	private async renderDocPanel(
		requestId: string,
		panelId: string,
		context: ExtensionDocPanelRenderContext
	): Promise<void> {
		try {
			if (!this.activated) {
				await this.activate('doc-panel', context);
			}

			const renderer = this.docPanelRenderers.get(panelId);
			if (!renderer) {
				throw new Error(`Doc panel "${panelId}" is not registered by the extension runtime.`);
			}

			const result = await this.invocationContext.run(context, async () => renderer(context));
			this.send({
				kind: 'doc-panel.result',
				payload: {
					requestId,
					result,
				},
			});
		} catch (error) {
			this.send({
				kind: 'error',
				payload: {
					requestId,
					error: error instanceof Error ? error.message : String(error),
				},
			});
		}
	}

	private async dispatchEvent<TType extends keyof ExtensionEventPayloadMap>(
		eventType: TType,
		payload: ExtensionEventPayloadMap[TType],
		context?: ExtensionExecutionContext
	): Promise<void> {
		const listeners =
			eventType === 'workspace.changed'
				? Array.from(this.workspaceListeners)
				: eventType === 'document.changed'
					? Array.from(this.documentListeners)
					: Array.from(this.taskListeners);

		for (const listener of listeners) {
			await this.invocationContext.run(context, async () => {
				if (eventType === 'document.changed') {
					await (listener as (event: ExtensionDocumentChangedEvent['document']) => void | Promise<void>)(
						(payload as ExtensionDocumentChangedEvent).document
					);
					return;
				}
				await (listener as (event: ExtensionEventPayloadMap[TType]) => void | Promise<void>)(
					payload
				);
			});
		}
	}

	private resolveHostCall(
		requestId: string,
		success: boolean,
		result: unknown,
		error?: string
	): void {
		const pending = this.pendingHostCalls.get(requestId);
		if (!pending) return;
		this.pendingHostCalls.delete(requestId);

		if (success) {
			pending.resolve(result);
			return;
		}

		pending.reject(new Error(error ?? 'Host call failed.'));
	}

	private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
		this.send({
			kind: 'log',
			payload: {
				level,
				message,
				data,
			},
		});
	}

	private send(message: ExtensionHostToMainMessage): void {
		process.parentPort?.postMessage(message);
	}
}

const runtime = new ExtensionHostRuntime();

process.parentPort?.on('message', (message) => {
	const maybeEnvelope = message as unknown as { data?: unknown };
	const nextMessage =
		typeof maybeEnvelope === 'object' &&
		maybeEnvelope !== null &&
		'data' in maybeEnvelope &&
		maybeEnvelope.data !== undefined
			? (maybeEnvelope.data as MainToExtensionHostMessage)
			: (message as unknown as MainToExtensionHostMessage);

	Promise.resolve(runtime.handleMessage(nextMessage)).catch((error) => {
		process.parentPort?.postMessage({
			kind: 'error',
			payload: {
				error: error instanceof Error ? error.message : String(error),
			},
		} satisfies ExtensionHostToMainMessage);
	});
});
