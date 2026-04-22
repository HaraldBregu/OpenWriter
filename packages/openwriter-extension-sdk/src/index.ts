import type {
	ExtensionAppInfo,
	ExtensionCommandContribution,
	ExtensionDocumentSnapshot,
	ExtensionDocumentUpdate,
	ExtensionManifest,
	ExtensionTaskEvent,
	ExtensionTaskSubmission,
	ExtensionTaskSubmissionResult,
	ExtensionWorkspaceChangedEvent,
	ExtensionWorkspaceSnapshot,
} from '../../openwriter-extension-types/src/index';

export interface ExtensionCommandRegistration extends ExtensionCommandContribution {
	run: (payload?: unknown) => Promise<unknown> | unknown;
}

export interface ExtensionHostApi {
	app: {
		getInfo(): Promise<ExtensionAppInfo>;
	};
	workspace: {
		getCurrent(): Promise<ExtensionWorkspaceSnapshot>;
	};
	documents: {
		getActive(): Promise<ExtensionDocumentSnapshot | null>;
		getById(documentId: string): Promise<ExtensionDocumentSnapshot>;
		update(documentId: string, patch: ExtensionDocumentUpdate): Promise<ExtensionDocumentSnapshot>;
	};
	tasks: {
		submit(submission: ExtensionTaskSubmission): Promise<ExtensionTaskSubmissionResult>;
	};
}

export interface ExtensionStorageApi {
	get<T = unknown>(key: string): Promise<T | null>;
	set<T = unknown>(key: string, value: T): Promise<T>;
	delete(key: string): Promise<void>;
}

export interface ExtensionEventsApi {
	onWorkspaceChanged(listener: (event: ExtensionWorkspaceChangedEvent) => void | Promise<void>): () => void;
	onDocumentChanged(listener: (event: ExtensionDocumentSnapshot) => void | Promise<void>): () => void;
	onTaskEvent(listener: (event: ExtensionTaskEvent) => void | Promise<void>): () => void;
}

export interface ExtensionCommandsApi {
	register(command: ExtensionCommandRegistration): () => void;
}

export interface ExtensionLoggerApi {
	info(message: string, data?: unknown): void;
	warn(message: string, data?: unknown): void;
	error(message: string, data?: unknown): void;
}

export interface ExtensionContext {
	manifest: ExtensionManifest;
	commands: ExtensionCommandsApi;
	events: ExtensionEventsApi;
	host: ExtensionHostApi;
	storage: ExtensionStorageApi;
	log: ExtensionLoggerApi;
}

export interface ExtensionModule {
	activate(context: ExtensionContext): Promise<void> | void;
	deactivate?(): Promise<void> | void;
}

export function defineExtension(module: ExtensionModule): ExtensionModule {
	return module;
}

export type {
	ExtensionActivationEvent,
	ExtensionCapability,
	ExtensionCommandContribution,
	ExtensionCommandExecutionResult,
	ExtensionCommandInfo,
	ExtensionDocumentChangedEvent,
	ExtensionDocumentSnapshot,
	ExtensionDocumentUpdate,
	ExtensionExecutionContext,
	ExtensionInfo,
	ExtensionManifest,
	ExtensionPermission,
	ExtensionRuntimeState,
	ExtensionSource,
	ExtensionTaskEvent,
	ExtensionTaskSubmission,
	ExtensionTaskSubmissionResult,
	ExtensionWorkspaceChangedEvent,
	ExtensionWorkspaceSnapshot,
} from '../../openwriter-extension-types/src/index';
