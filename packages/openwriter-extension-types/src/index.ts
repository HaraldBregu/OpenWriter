export const OPENWRITER_EXTENSION_API_VERSION = '1';

export type ExtensionCapability =
	| 'commands'
	| 'host-data'
	| 'host-actions'
	| 'tasks'
	| 'events'
	| 'doc-panels'
	| 'doc-pages';

export const EXTENSION_CAPABILITIES: readonly ExtensionCapability[] = [
	'commands',
	'host-data',
	'host-actions',
	'tasks',
	'events',
	'doc-panels',
	'doc-pages',
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

export interface ExtensionIconAsset {
	type: 'asset';
	path: string;
}

export type ExtensionIconDefinition = string | ExtensionIconAsset;

export interface ExtensionCommandContribution {
	id: string;
	title: string;
	description: string;
	when?: ExtensionCommandAvailability;
}

export interface ExtensionDocPanelContribution {
	id: string;
	title: string;
	description?: string;
	when?: 'document';
	icon?: ExtensionIconDefinition;
	order?: number;
}

export interface ExtensionDocPageContribution {
	id: string;
	title: string;
	description?: string;
	icon?: ExtensionIconDefinition;
	order?: number;
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
		docPanels?: ExtensionDocPanelContribution[];
		docPages?: ExtensionDocPageContribution[];
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

export interface ExtensionDocumentSelectionSnapshot {
	from: number;
	to: number;
	text: string;
}

export interface ExtensionDocumentEditorStateSnapshot {
	isFocused: boolean;
	isEditable: boolean;
	isEmpty: boolean;
	activeNode: string | null;
	activeMarks: string[];
}

export interface ExtensionDocumentContextSnapshot {
	documentId: string;
	markdown: string;
	selection: ExtensionDocumentSelectionSnapshot | null;
	editorState: ExtensionDocumentEditorStateSnapshot;
}

export interface ExtensionDocumentUpdate {
	title?: string;
	content?: string;
}

export type ExtensionDocPanelNoticeTone = 'info' | 'warning' | 'error' | 'success';
export type ExtensionDocPanelButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost';
export type ExtensionDocPanelRenderReason = 'open' | 'refresh' | 'document-changed';

export interface ExtensionDocPanelTextBlock {
	id?: string;
	type: 'text';
	text: string;
}

export interface ExtensionDocPanelMarkdownBlock {
	id?: string;
	type: 'markdown';
	markdown: string;
}

export interface ExtensionDocPanelKeyValueItem {
	label: string;
	value: string;
}

export interface ExtensionDocPanelKeyValueListBlock {
	id?: string;
	type: 'keyValueList';
	items: ExtensionDocPanelKeyValueItem[];
}

export interface ExtensionDocPanelNoticeBlock {
	id?: string;
	type: 'notice';
	tone?: ExtensionDocPanelNoticeTone;
	title?: string;
	description: string;
}

export interface ExtensionDocPanelButtonAction {
	id: string;
	label: string;
	commandId: string;
	payload?: unknown;
	variant?: ExtensionDocPanelButtonVariant;
}

export interface ExtensionDocPanelButtonRowBlock {
	id?: string;
	type: 'buttonRow';
	buttons: ExtensionDocPanelButtonAction[];
}

export type ExtensionDocPanelBlock =
	| ExtensionDocPanelTextBlock
	| ExtensionDocPanelMarkdownBlock
	| ExtensionDocPanelKeyValueListBlock
	| ExtensionDocPanelNoticeBlock
	| ExtensionDocPanelButtonRowBlock;

export interface ExtensionDocPanelContent {
	blocks: ExtensionDocPanelBlock[];
}

export interface ExtensionDocPanelRenderContext {
	panelId: string;
	documentId: string;
	windowId?: number;
	reason: ExtensionDocPanelRenderReason;
	documentContext: ExtensionDocumentContextSnapshot | null;
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
	'documents.getContext': {
		args: [documentId?: string];
		result: ExtensionDocumentContextSnapshot | null;
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
	registeredDocPanels: string[];
}

export interface ExtensionInfo {
	id: string;
	name: string;
	version: string;
	apiVersion: string;
	main: string;
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
	docPanels: ExtensionDocPanelContribution[];
	docPages: ExtensionDocPageContribution[];
	validationErrors: string[];
}

export interface ExtensionRuntimeInfo extends ExtensionInfo {
	runtime: ExtensionRuntimeState;
}

export interface ExtensionRegistrySnapshot {
	extensions: ExtensionRuntimeInfo[];
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

export interface ExtensionDocPanelInfo extends Omit<ExtensionDocPanelContribution, 'id'> {
	id: string;
	localId: string;
	extensionId: string;
	extensionName: string;
	enabled: boolean;
	iconAssetUri?: string;
}

export interface ExtensionCommandQuery {
	includeDisabled?: boolean;
}

export interface ExtensionCommandRegistration {
	id: string;
}

export interface ExtensionDocPanelRegistration {
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

export interface ExtensionHostRenderDocPanelPayload {
	requestId: string;
	panelId: string;
	context: ExtensionDocPanelRenderContext;
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

export interface ExtensionDocPanelResultPayload {
	requestId: string;
	result: ExtensionDocPanelContent;
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

export interface ExtensionDocPanelsChangedPayload {
	documentId?: string | null;
	windowId?: number;
}

export interface ExtensionDocPanelContentChangedPayload {
	documentId: string;
	windowId?: number;
	reason?: 'document' | 'context';
	changedKeys?: Array<'markdown' | 'selection' | 'editorState'>;
}

export type MainToExtensionHostMessage =
	| { kind: 'bootstrap'; payload: ExtensionHostBootstrapPayload }
	| { kind: 'activate'; payload: ExtensionHostActivatePayload }
	| { kind: 'deactivate' }
	| { kind: 'command.execute'; payload: ExtensionHostExecuteCommandPayload }
	| { kind: 'doc-panel.render'; payload: ExtensionHostRenderDocPanelPayload }
	| { kind: 'event.dispatch'; payload: ExtensionHostDispatchEventPayload }
	| { kind: 'host.result'; payload: ExtensionHostCallResultPayload };

export type ExtensionHostToMainMessage =
	| { kind: 'ready' }
	| { kind: 'activated'; payload: ExtensionHostLifecyclePayload }
	| { kind: 'deactivated'; payload: ExtensionHostLifecyclePayload }
	| { kind: 'command.registered'; payload: ExtensionCommandRegistration }
	| { kind: 'command.result'; payload: ExtensionCommandResultPayload }
	| { kind: 'doc-panel.registered'; payload: ExtensionDocPanelRegistration }
	| { kind: 'doc-panel.result'; payload: ExtensionDocPanelResultPayload }
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

export function extensionDocPanelId(extensionId: string, panelId: string): string {
	return `extension:${extensionId}:${panelId}`;
}

export function parseExtensionDocPanelId(
	value: string
): { extensionId: string; panelId: string } | null {
	if (!value.startsWith('extension:')) return null;

	const withoutPrefix = value.slice('extension:'.length);
	const separatorIndex = withoutPrefix.indexOf(':');
	if (separatorIndex < 0) return null;

	const extensionId = withoutPrefix.slice(0, separatorIndex);
	const panelId = withoutPrefix.slice(separatorIndex + 1);
	if (!extensionId || !panelId) return null;

	return { extensionId, panelId };
}
