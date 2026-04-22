export const OPENWRITER_EXTENSION_API_VERSION = '1';

export type ExtensionCapability = 'commands' | 'host-data' | 'host-actions' | 'tasks' | 'events';

export const EXTENSION_CAPABILITIES: readonly ExtensionCapability[] = [
	'commands',
	'host-data',
	'host-actions',
	'tasks',
	'events',
];

export type ExtensionPermission =
	| 'app.read'
	| 'app.write'
	| 'workspace.read'
	| 'workspace.write'
	| 'document.read'
	| 'document.write'
	| 'task.submit'
	| 'task.observe';

export const EXTENSION_PERMISSIONS: readonly ExtensionPermission[] = [
	'app.read',
	'app.write',
	'workspace.read',
	'workspace.write',
	'document.read',
	'document.write',
	'task.submit',
	'task.observe',
];

export type ExtensionActivationEvent =
	| 'onStartup'
	| 'onWorkspaceOpened'
	| 'onDocumentOpened'
	| `onCommand:${string}`;

export type ExtensionCommandAvailability = 'always' | 'document';
export type ExtensionSource = 'bundled' | 'user';
export type ExtensionRuntimeStatus =
	| 'idle'
	| 'starting'
	| 'running'
	| 'stopped'
	| 'crashed'
	| 'invalid';

export interface ExtensionCommandContribution {
	id: string;
	title: string;
	description: string;
	when?: ExtensionCommandAvailability;
}

export interface ExtensionManifest {
	id: string;
	name: string;
	version: string;
	apiVersion: string;
	main: string;
	description?: string;
	author?: string;
	defaultEnabled?: boolean;
	capabilities?: ExtensionCapability[];
	permissions?: ExtensionPermission[];
	activationEvents?: ExtensionActivationEvent[];
	contributes?: {
		commands?: ExtensionCommandContribution[];
	};
}

export interface ExtensionExecutionContext {
	windowId?: number;
	documentId?: string | null;
	reason?: string;
}

export interface ExtensionAppInfo {
	appName: string;
	version: string;
	platform: string;
}

export interface ExtensionWorkspaceSnapshot {
	currentPath: string | null;
	projectName: string | null;
	windowId?: number;
	documentId?: string | null;
}

export interface ExtensionDocumentSnapshot {
	id: string;
	title: string;
	content: string;
	path: string;
	windowId?: number;
}

export interface ExtensionDocumentUpdate {
	title?: string;
	content?: string;
}

export interface ExtensionTaskSubmitOptions {
	priority?: 'low' | 'normal' | 'high';
	timeoutMs?: number;
}

export interface ExtensionTaskSubmission {
	type: string;
	input: unknown;
	options?: ExtensionTaskSubmitOptions;
	metadata?: Record<string, unknown>;
}

export interface ExtensionTaskSubmissionResult {
	taskId: string;
}

export interface ExtensionWorkspaceChangedEvent {
	currentPath: string | null;
	previousPath: string | null;
	windowId?: number;
}

export interface ExtensionDocumentChangedEvent {
	document: ExtensionDocumentSnapshot;
	windowId?: number;
}

export type ExtensionTaskState = 'submitted' | 'started' | 'completed' | 'failed' | 'cancelled';

export interface ExtensionTaskEvent {
	taskId: string;
	taskType: string;
	state: ExtensionTaskState;
	windowId?: number;
	result?: unknown;
	error?: string;
	durationMs?: number;
}

export interface ExtensionCommandExecutionResult {
	ok: boolean;
	data?: unknown;
	error?: string;
}

export interface ExtensionStorageEntry {
	key: string;
	value: unknown;
}

export interface ExtensionHostRequestMap {
	'app.getInfo': {
		args: [];
		result: ExtensionAppInfo;
		permission: 'app.read';
	};
	'workspace.getCurrent': {
		args: [];
		result: ExtensionWorkspaceSnapshot;
		permission: 'workspace.read';
	};
	'documents.getActive': {
		args: [];
		result: ExtensionDocumentSnapshot | null;
		permission: 'document.read';
	};
	'documents.getById': {
		args: [documentId: string];
		result: ExtensionDocumentSnapshot;
		permission: 'document.read';
	};
	'documents.update': {
		args: [documentId: string, patch: ExtensionDocumentUpdate];
		result: ExtensionDocumentSnapshot;
		permission: 'document.write';
	};
	'tasks.submit': {
		args: [submission: ExtensionTaskSubmission];
		result: ExtensionTaskSubmissionResult;
		permission: 'task.submit';
	};
	'storage.get': {
		args: [key: string];
		result: unknown | null;
		permission: null;
	};
	'storage.set': {
		args: [key: string, value: unknown];
		result: ExtensionStorageEntry;
		permission: null;
	};
	'storage.delete': {
		args: [key: string];
		result: void;
		permission: null;
	};
}

export type ExtensionEventType = 'workspace.changed' | 'document.changed' | 'task.event';

export interface ExtensionEventPayloadMap {
	'workspace.changed': ExtensionWorkspaceChangedEvent;
	'document.changed': ExtensionDocumentChangedEvent;
	'task.event': ExtensionTaskEvent;
}

export interface ExtensionRuntimeState {
	status: ExtensionRuntimeStatus;
	activated: boolean;
	pid?: number;
	startedAt?: number;
	lastError?: string;
	crashCount: number;
	registeredCommands: string[];
}

export interface ExtensionInfo {
	id: string;
	name: string;
	version: string;
	apiVersion: string;
	description?: string;
	author?: string;
	source: ExtensionSource;
	extensionPath: string;
	manifestPath: string;
	enabled: boolean;
	capabilities: ExtensionCapability[];
	permissions: ExtensionPermission[];
	activationEvents: ExtensionActivationEvent[];
	commands: ExtensionCommandContribution[];
	validationErrors: string[];
}

export interface ExtensionRegistrySnapshot {
	extensions: ExtensionInfo[];
}

export interface ExtensionRuntimeChangedPayload {
	extensionId: string;
	state: ExtensionRuntimeState;
}

export interface ExtensionCommandInfo extends ExtensionCommandContribution {
	extensionId: string;
	extensionName: string;
	enabled: boolean;
}

export interface ExtensionCommandQuery {
	includeDisabled?: boolean;
}

export interface ExtensionCommandRegistration {
	id: string;
}

export interface ExtensionHostBootstrapPayload {
	manifest: ExtensionManifest;
	extensionPath: string;
}

export interface ExtensionHostActivatePayload {
	reason: string;
	context?: ExtensionExecutionContext;
}

export interface ExtensionHostExecuteCommandPayload {
	requestId: string;
	commandId: string;
	payload?: unknown;
	context?: ExtensionExecutionContext;
}

export interface ExtensionHostDispatchEventPayload<
	TType extends ExtensionEventType = ExtensionEventType,
> {
	eventType: TType;
	payload: ExtensionEventPayloadMap[TType];
	context?: ExtensionExecutionContext;
}

export interface ExtensionHostCallPayload<
	TMethod extends keyof ExtensionHostRequestMap = keyof ExtensionHostRequestMap,
> {
	requestId: string;
	method: TMethod;
	args: ExtensionHostRequestMap[TMethod]['args'];
	context?: ExtensionExecutionContext;
}

export interface ExtensionHostCallResultPayload {
	requestId: string;
	success: boolean;
	result?: unknown;
	error?: string;
}

export interface ExtensionCommandResultPayload {
	requestId: string;
	result: ExtensionCommandExecutionResult;
}

export interface ExtensionHostLifecyclePayload {
	activated: boolean;
}

export interface ExtensionHostErrorPayload {
	requestId?: string;
	error: string;
}

export interface ExtensionHostLogPayload {
	level: 'info' | 'warn' | 'error';
	message: string;
	data?: unknown;
}

export type MainToExtensionHostMessage =
	| { kind: 'bootstrap'; payload: ExtensionHostBootstrapPayload }
	| { kind: 'activate'; payload: ExtensionHostActivatePayload }
	| { kind: 'deactivate' }
	| { kind: 'command.execute'; payload: ExtensionHostExecuteCommandPayload }
	| { kind: 'event.dispatch'; payload: ExtensionHostDispatchEventPayload }
	| { kind: 'host.result'; payload: ExtensionHostCallResultPayload };

export type ExtensionHostToMainMessage =
	| { kind: 'ready' }
	| { kind: 'activated'; payload: ExtensionHostLifecyclePayload }
	| { kind: 'deactivated'; payload: ExtensionHostLifecyclePayload }
	| { kind: 'command.registered'; payload: ExtensionCommandRegistration }
	| { kind: 'command.result'; payload: ExtensionCommandResultPayload }
	| { kind: 'host.call'; payload: ExtensionHostCallPayload }
	| { kind: 'error'; payload: ExtensionHostErrorPayload }
	| { kind: 'log'; payload: ExtensionHostLogPayload };

export function isCommandActivationEvent(
	event: ExtensionActivationEvent
): event is `onCommand:${string}` {
	return event.startsWith('onCommand:');
}

export function commandActivationEvent(commandId: string): `onCommand:${string}` {
	return `onCommand:${commandId}`;
}
