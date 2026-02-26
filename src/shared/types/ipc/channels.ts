// ---------------------------------------------------------------------------
// Shared IPC Channel Constants & Type Maps
// ---------------------------------------------------------------------------
// Single source of truth for all IPC channel names and their type signatures.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

import type { ProviderSettings, InferenceDefaultsUpdate } from '../aiSettings'
import type {
  MediaPermissionStatus,
  MediaDeviceInfo,
  BluetoothInfo,
  NetworkConnectionStatus,
  NetworkInterfaceInfo,
  NetworkInfo,
  CronJobConfig,
  CronJobStatus,
  CronJobResult,
  CronValidationResult,
  LifecycleEvent,
  LifecycleState,
  ManagedWindowInfo,
  WindowManagerState,
  FileInfo,
  FsSaveResult,
  FsWriteResult,
  FsWatchEvent,
  DialogResult,
  NotificationOptions,
  NotificationResult,
  ClipboardContent,
  ClipboardImageData,
  WorkspaceInfo,
  ChatMessage,
  AgentSessionConfig,
  AgentSessionInfo,
  AgentRunOptions,
  AgentStatusInfo,
  PipelineInput,
  PipelineEvent,
  PipelineActiveRun,
  TaskSubmitPayload,
  TaskInfo,
  TaskEvent,
  PostData,
  PostSyncResult,
  PostFileChangeEvent,
  DocumentInfo,
  DocumentFileChangeEvent,
  OutputFile,
  OutputFileChangeEvent,
  SaveOutputInput,
  SaveOutputResult,
  OutputUpdateParams,
  DirectoryEntry,
  DirectoryAddManyResult,
  DirectoryValidationResult,
  PersonalityFile,
  SavePersonalityInput,
  SavePersonalityResult,
  SectionConfig,
  SectionConfigUpdate,
  PersonalityFileChangeEvent,
  SectionConfigChangeEvent,
  WritingContextMenuAction,
  PostContextMenuAction,
  WatcherError,
} from './types'

// ===========================================================================
// Channel Name Constants (grouped by domain)
// ===========================================================================

export const ClipboardChannels = {
  writeText: 'clipboard-write-text',
  readText: 'clipboard-read-text',
  writeHTML: 'clipboard-write-html',
  readHTML: 'clipboard-read-html',
  writeImage: 'clipboard-write-image',
  readImage: 'clipboard-read-image',
  clear: 'clipboard-clear',
  getContent: 'clipboard-get-content',
  getFormats: 'clipboard-get-formats',
  hasText: 'clipboard-has-text',
  hasImage: 'clipboard-has-image',
  hasHTML: 'clipboard-has-html',
} as const

export const StoreChannels = {
  getAllProviderSettings: 'store-get-all-provider-settings',
  getProviderSettings: 'store-get-provider-settings',
  setProviderSettings: 'store-set-provider-settings',
  setInferenceDefaults: 'store-set-inference-defaults',
  getAllModelSettings: 'store-get-all-model-settings',
  getModelSettings: 'store-get-model-settings',
  setSelectedModel: 'store-set-selected-model',
  setApiToken: 'store-set-api-token',
  setModelSettings: 'store-set-model-settings',
  getCurrentWorkspace: 'store-get-current-workspace',
  setCurrentWorkspace: 'store-set-current-workspace',
  getRecentWorkspaces: 'store-get-recent-workspaces',
  clearCurrentWorkspace: 'store-clear-current-workspace',
} as const

export const WorkspaceChannels = {
  selectFolder: 'workspace:select-folder',
  getCurrent: 'workspace-get-current',
  setCurrent: 'workspace-set-current',
  getRecent: 'workspace-get-recent',
  clear: 'workspace-clear',
  directoryExists: 'workspace-directory-exists',
  removeRecent: 'workspace-remove-recent',
} as const

export const WindowChannels = {
  minimize: 'window:minimize',
  maximize: 'window:maximize',
  close: 'window:close',
  isMaximized: 'window:is-maximized',
  isFullScreen: 'window:is-fullscreen',
  maximizeChange: 'window:maximize-change',
  fullScreenChange: 'window:fullscreen-change',
  getPlatform: 'window:get-platform',
  popupMenu: 'window:popup-menu',
} as const

export const WmChannels = {
  createChild: 'wm-create-child',
  createModal: 'wm-create-modal',
  createFrameless: 'wm-create-frameless',
  createWidget: 'wm-create-widget',
  closeWindow: 'wm-close-window',
  closeAll: 'wm-close-all',
  getState: 'wm-get-state',
  stateChanged: 'wm-state-changed',
} as const

export const MediaChannels = {
  requestMicrophone: 'media-permissions-request-microphone',
  requestCamera: 'media-permissions-request-camera',
  getMicrophoneStatus: 'media-permissions-get-microphone',
  getCameraStatus: 'media-permissions-get-camera',
  getDevices: 'media-permissions-get-devices',
} as const

export const BluetoothChannels = {
  isSupported: 'bluetooth-is-supported',
  getPermissionStatus: 'bluetooth-get-permission-status',
  getInfo: 'bluetooth-get-info',
} as const

export const NetworkChannels = {
  isSupported: 'network-is-supported',
  getConnectionStatus: 'network-get-connection-status',
  getInterfaces: 'network-get-interfaces',
  getInfo: 'network-get-info',
  statusChanged: 'network-status-changed',
} as const

export const CronChannels = {
  getAll: 'cron-get-all-jobs',
  getJob: 'cron-get-job',
  start: 'cron-start-job',
  stop: 'cron-stop-job',
  delete: 'cron-delete-job',
  create: 'cron-create-job',
  updateSchedule: 'cron-update-schedule',
  validateExpression: 'cron-validate-expression',
  jobResult: 'cron-job-result',
} as const

export const LifecycleChannels = {
  getState: 'lifecycle-get-state',
  getEvents: 'lifecycle-get-events',
  restart: 'lifecycle-restart',
  event: 'lifecycle-event',
} as const

export const FsChannels = {
  openFileDialog: 'fs-open-file-dialog',
  readFile: 'fs-read-file',
  saveFileDialog: 'fs-save-file-dialog',
  writeFile: 'fs-write-file',
  selectDirectory: 'fs-select-directory',
  watchDirectory: 'fs-watch-directory',
  unwatchDirectory: 'fs-unwatch-directory',
  getWatchedDirectories: 'fs-get-watched-directories',
  watchEvent: 'fs-watch-event',
} as const

export const DialogChannels = {
  open: 'dialog-open',
  openDirectory: 'dialog-open-directory',
  save: 'dialog-save',
  message: 'dialog-message',
  error: 'dialog-error',
} as const

export const NotificationChannels = {
  isSupported: 'notification-is-supported',
  show: 'notification-show',
  event: 'notification-event',
} as const

export const AgentChannels = {
  createSession: 'agent:create-session',
  destroySession: 'agent:destroy-session',
  getSession: 'agent:get-session',
  listSessions: 'agent:list-sessions',
  clearSessions: 'agent:clear-sessions',
  run: 'agent:run',
  runSession: 'agent:run-session',
  cancel: 'agent:cancel',
  cancelSession: 'agent:cancel-session',
  getStatus: 'agent:get-status',
  isRunning: 'agent:is-running',
  // Event channels pushed from main → renderer
  token: 'agent:token',
  thinking: 'agent:thinking',
  toolStart: 'agent:tool_start',
  toolEnd: 'agent:tool_end',
  done: 'agent:done',
  error: 'agent:error',
} as const

export const PipelineChannels = {
  run: 'pipeline:run',
  cancel: 'pipeline:cancel',
  listAgents: 'pipeline:list-agents',
  listRuns: 'pipeline:list-runs',
  event: 'pipeline:event',
} as const

export const TaskChannels = {
  submit: 'task:submit',
  cancel: 'task:cancel',
  list: 'task:list',
  event: 'task:event',
} as const

export const PostsChannels = {
  syncToWorkspace: 'posts:sync-to-workspace',
  updatePost: 'posts:update-post',
  deletePost: 'posts:delete-post',
  loadFromWorkspace: 'posts:load-from-workspace',
  fileChanged: 'posts:file-changed',
  watcherError: 'posts:watcher-error',
} as const

export const DocumentsChannels = {
  importFiles: 'documents:import-files',
  importByPaths: 'documents:import-by-paths',
  downloadFromUrl: 'documents:download-from-url',
  loadAll: 'documents:load-all',
  deleteFile: 'documents:delete-file',
  fileChanged: 'documents:file-changed',
  watcherError: 'documents:watcher-error',
} as const

export const OutputChannels = {
  save: 'output:save',
  loadAll: 'output:load-all',
  loadByType: 'output:load-by-type',
  loadOne: 'output:load-one',
  update: 'output:update',
  delete: 'output:delete',
  fileChanged: 'output:file-changed',
  watcherError: 'output:watcher-error',
} as const

export const DirectoriesChannels = {
  list: 'directories:list',
  add: 'directories:add',
  addMany: 'directories:add-many',
  remove: 'directories:remove',
  validate: 'directories:validate',
  markIndexed: 'directories:mark-indexed',
  changed: 'directories:changed',
} as const

export const PersonalityChannels = {
  save: 'personality:save',
  loadAll: 'personality:load-all',
  loadOne: 'personality:load-one',
  delete: 'personality:delete',
  loadSectionConfig: 'personality:load-section-config',
  saveSectionConfig: 'personality:save-section-config',
  fileChanged: 'personality:file-changed',
  watcherError: 'personality:watcher-error',
  sectionConfigChanged: 'personality:section-config-changed',
} as const

export const ContextMenuChannels = {
  writing: 'context-menu:writing',
  writingAction: 'context-menu:writing-action',
  post: 'context-menu:post',
  postAction: 'context-menu:post-action',
} as const

export const AppChannels = {
  playSound: 'play-sound',
  setTheme: 'set-theme',
  contextMenu: 'context-menu',
  contextMenuEditable: 'context-menu-editable',
  changeLanguage: 'change-language',
  changeTheme: 'change-theme',
  fileOpened: 'file-opened',
} as const

// Legacy model settings type (kept for backward compat with store legacy channels)
interface LegacyModelSettings {
  selectedModel: string
  apiToken: string
}

// ===========================================================================
// Channel-to-Type Maps
// ===========================================================================
// These map each channel to its args (tuple) and result type.
// `result` represents the LOGICAL return type (T, not IpcResult<T>).
// The IpcResult wrapping is an implementation detail of the transport layer.

/**
 * Channels using ipcRenderer.invoke / ipcMain.handle.
 * `args` = tuple of arguments after the channel name.
 * `result` = the logical return type.
 */
export interface InvokeChannelMap {
  // ---- Clipboard (raw, no IpcResult wrapping) ----
  [ClipboardChannels.writeText]: { args: [text: string]; result: boolean }
  [ClipboardChannels.readText]: { args: []; result: string }
  [ClipboardChannels.writeHTML]: { args: [html: string]; result: boolean }
  [ClipboardChannels.readHTML]: { args: []; result: string }
  [ClipboardChannels.writeImage]: { args: [dataURL: string]; result: boolean }
  [ClipboardChannels.readImage]: { args: []; result: ClipboardImageData | null }
  [ClipboardChannels.clear]: { args: []; result: boolean }
  [ClipboardChannels.getContent]: { args: []; result: ClipboardContent | null }
  [ClipboardChannels.getFormats]: { args: []; result: string[] }
  [ClipboardChannels.hasText]: { args: []; result: boolean }
  [ClipboardChannels.hasImage]: { args: []; result: boolean }
  [ClipboardChannels.hasHTML]: { args: []; result: boolean }

  // ---- Store (IpcResult-wrapped) ----
  [StoreChannels.getAllProviderSettings]: { args: []; result: Record<string, ProviderSettings> }
  [StoreChannels.getProviderSettings]: { args: [providerId: string]; result: ProviderSettings | null }
  [StoreChannels.setProviderSettings]: { args: [providerId: string, settings: ProviderSettings]; result: void }
  [StoreChannels.setInferenceDefaults]: { args: [providerId: string, update: InferenceDefaultsUpdate]; result: void }
  [StoreChannels.getAllModelSettings]: { args: []; result: Record<string, LegacyModelSettings> }
  [StoreChannels.getModelSettings]: { args: [providerId: string]; result: LegacyModelSettings | null }
  [StoreChannels.setSelectedModel]: { args: [providerId: string, modelId: string]; result: void }
  [StoreChannels.setApiToken]: { args: [providerId: string, token: string]; result: void }
  [StoreChannels.setModelSettings]: { args: [providerId: string, settings: LegacyModelSettings]; result: void }
  [StoreChannels.getCurrentWorkspace]: { args: []; result: string | null }
  [StoreChannels.setCurrentWorkspace]: { args: [workspacePath: string]; result: void }
  [StoreChannels.getRecentWorkspaces]: { args: []; result: WorkspaceInfo[] }
  [StoreChannels.clearCurrentWorkspace]: { args: []; result: void }

  // ---- Workspace (IpcResult-wrapped) ----
  [WorkspaceChannels.selectFolder]: { args: []; result: string | null }
  [WorkspaceChannels.getCurrent]: { args: []; result: string | null }
  [WorkspaceChannels.setCurrent]: { args: [workspacePath: string]; result: void }
  [WorkspaceChannels.getRecent]: { args: []; result: WorkspaceInfo[] }
  [WorkspaceChannels.clear]: { args: []; result: void }
  [WorkspaceChannels.directoryExists]: { args: [directoryPath: string]; result: boolean }
  [WorkspaceChannels.removeRecent]: { args: [workspacePath: string]; result: void }

  // ---- Window (IpcResult-wrapped for handle, raw for others) ----
  [WindowChannels.isMaximized]: { args: []; result: boolean }
  [WindowChannels.isFullScreen]: { args: []; result: boolean }
  [WindowChannels.getPlatform]: { args: []; result: string }

  // ---- Window Manager (IpcResult-wrapped) ----
  [WmChannels.createChild]: { args: []; result: ManagedWindowInfo }
  [WmChannels.createModal]: { args: []; result: ManagedWindowInfo }
  [WmChannels.createFrameless]: { args: []; result: ManagedWindowInfo }
  [WmChannels.createWidget]: { args: []; result: ManagedWindowInfo }
  [WmChannels.closeWindow]: { args: [id: number]; result: boolean }
  [WmChannels.closeAll]: { args: []; result: void }
  [WmChannels.getState]: { args: []; result: WindowManagerState }

  // ---- Media Permissions (raw, no IpcResult wrapping) ----
  [MediaChannels.requestMicrophone]: { args: []; result: MediaPermissionStatus }
  [MediaChannels.requestCamera]: { args: []; result: MediaPermissionStatus }
  [MediaChannels.getMicrophoneStatus]: { args: []; result: MediaPermissionStatus }
  [MediaChannels.getCameraStatus]: { args: []; result: MediaPermissionStatus }
  [MediaChannels.getDevices]: { args: [type: 'audioinput' | 'videoinput']; result: MediaDeviceInfo[] }

  // ---- Bluetooth (raw) ----
  [BluetoothChannels.isSupported]: { args: []; result: boolean }
  [BluetoothChannels.getPermissionStatus]: { args: []; result: string }
  [BluetoothChannels.getInfo]: { args: []; result: BluetoothInfo }

  // ---- Network (raw) ----
  [NetworkChannels.isSupported]: { args: []; result: boolean }
  [NetworkChannels.getConnectionStatus]: { args: []; result: NetworkConnectionStatus }
  [NetworkChannels.getInterfaces]: { args: []; result: NetworkInterfaceInfo[] }
  [NetworkChannels.getInfo]: { args: []; result: NetworkInfo }

  // ---- Cron (IpcResult-wrapped) ----
  [CronChannels.getAll]: { args: []; result: CronJobStatus[] }
  [CronChannels.getJob]: { args: [id: string]; result: CronJobStatus | null }
  [CronChannels.start]: { args: [id: string]; result: boolean }
  [CronChannels.stop]: { args: [id: string]; result: boolean }
  [CronChannels.delete]: { args: [id: string]; result: boolean }
  [CronChannels.create]: { args: [config: CronJobConfig]; result: boolean }
  [CronChannels.updateSchedule]: { args: [id: string, schedule: string]; result: boolean }
  [CronChannels.validateExpression]: { args: [expression: string]; result: CronValidationResult }

  // ---- Lifecycle (raw) ----
  [LifecycleChannels.getState]: { args: []; result: LifecycleState }
  [LifecycleChannels.getEvents]: { args: []; result: LifecycleEvent[] }
  [LifecycleChannels.restart]: { args: []; result: void }

  // ---- Filesystem (IpcResult-wrapped) ----
  [FsChannels.openFileDialog]: { args: []; result: FileInfo | null }
  [FsChannels.readFile]: { args: [filePath: string]; result: FileInfo }
  [FsChannels.saveFileDialog]: { args: [defaultName: string, content: string]; result: FsSaveResult }
  [FsChannels.writeFile]: { args: [filePath: string, content: string]; result: FsWriteResult }
  [FsChannels.selectDirectory]: { args: []; result: string | null }
  [FsChannels.watchDirectory]: { args: [dirPath: string]; result: boolean }
  [FsChannels.unwatchDirectory]: { args: [dirPath: string]; result: boolean }
  [FsChannels.getWatchedDirectories]: { args: []; result: string[] }

  // ---- Dialog (IpcResult-wrapped) ----
  [DialogChannels.open]: { args: []; result: DialogResult }
  [DialogChannels.openDirectory]: { args: [multiSelections: boolean]; result: DialogResult }
  [DialogChannels.save]: { args: []; result: DialogResult }
  [DialogChannels.message]: { args: [message: string, detail: string, buttons: string[]]; result: DialogResult }
  [DialogChannels.error]: { args: [title: string, content: string]; result: DialogResult }

  // ---- Notification (raw) ----
  [NotificationChannels.isSupported]: { args: []; result: boolean }
  [NotificationChannels.show]: { args: [options: NotificationOptions]; result: string }

  // ---- Agent (IpcResult-wrapped for handle channels) ----
  [AgentChannels.createSession]: { args: [config: AgentSessionConfig]; result: AgentSessionInfo }
  [AgentChannels.destroySession]: { args: [sessionId: string]; result: boolean }
  [AgentChannels.getSession]: { args: [sessionId: string]; result: AgentSessionInfo | null }
  [AgentChannels.listSessions]: { args: []; result: AgentSessionInfo[] }
  [AgentChannels.clearSessions]: { args: []; result: number }
  [AgentChannels.run]: { args: [messages: ChatMessage[], runId: string, providerId: string]; result: void }
  [AgentChannels.runSession]: { args: [options: AgentRunOptions]; result: void }
  [AgentChannels.cancelSession]: { args: [sessionId: string]; result: boolean }
  [AgentChannels.getStatus]: { args: []; result: AgentStatusInfo }
  [AgentChannels.isRunning]: { args: [runId: string]; result: boolean }

  // ---- Pipeline (IpcResult-wrapped) ----
  [PipelineChannels.run]: { args: [agentName: string, input: PipelineInput]; result: { runId: string } }
  [PipelineChannels.listAgents]: { args: []; result: string[] }
  [PipelineChannels.listRuns]: { args: []; result: PipelineActiveRun[] }

  // ---- Task (IpcResult-wrapped via registerQuery/registerCommand) ----
  [TaskChannels.submit]: { args: [payload: TaskSubmitPayload]; result: { taskId: string } }
  [TaskChannels.cancel]: { args: [taskId: string]; result: boolean }
  [TaskChannels.list]: { args: []; result: TaskInfo[] }

  // ---- Posts (IpcResult-wrapped) ----
  [PostsChannels.syncToWorkspace]: { args: [posts: PostData[]]; result: PostSyncResult }
  [PostsChannels.updatePost]: { args: [post: PostData]; result: void }
  [PostsChannels.deletePost]: { args: [postId: string]; result: void }
  [PostsChannels.loadFromWorkspace]: { args: []; result: PostData[] }

  // ---- Documents (IpcResult-wrapped) ----
  [DocumentsChannels.importFiles]: { args: []; result: DocumentInfo[] }
  [DocumentsChannels.importByPaths]: { args: [paths: string[]]; result: DocumentInfo[] }
  [DocumentsChannels.downloadFromUrl]: { args: [url: string]; result: DocumentInfo }
  [DocumentsChannels.loadAll]: { args: []; result: DocumentInfo[] }
  [DocumentsChannels.deleteFile]: { args: [id: string]; result: void }

  // ---- Output (IpcResult-wrapped) ----
  [OutputChannels.save]: { args: [input: SaveOutputInput]; result: SaveOutputResult }
  [OutputChannels.loadAll]: { args: []; result: OutputFile[] }
  [OutputChannels.loadByType]: { args: [type: string]; result: OutputFile[] }
  [OutputChannels.loadOne]: { args: [params: { type: string; id: string }]; result: OutputFile | null }
  [OutputChannels.update]: { args: [params: OutputUpdateParams]; result: void }
  [OutputChannels.delete]: { args: [params: { type: string; id: string }]; result: void }

  // ---- Directories (IpcResult-wrapped) ----
  [DirectoriesChannels.list]: { args: []; result: DirectoryEntry[] }
  [DirectoriesChannels.add]: { args: [dirPath: string]; result: DirectoryEntry }
  [DirectoriesChannels.addMany]: { args: [dirPaths: string[]]; result: DirectoryAddManyResult }
  [DirectoriesChannels.remove]: { args: [id: string]; result: boolean }
  [DirectoriesChannels.validate]: { args: [dirPath: string]; result: DirectoryValidationResult }
  [DirectoriesChannels.markIndexed]: { args: [id: string, isIndexed: boolean]; result: boolean }

  // ---- Personality (IpcResult-wrapped) ----
  [PersonalityChannels.save]: { args: [input: SavePersonalityInput]; result: SavePersonalityResult }
  [PersonalityChannels.loadAll]: { args: []; result: PersonalityFile[] }
  [PersonalityChannels.loadOne]: { args: [params: { sectionId: string; id: string }]; result: PersonalityFile | null }
  [PersonalityChannels.delete]: { args: [params: { sectionId: string; id: string }]; result: void }
  [PersonalityChannels.loadSectionConfig]: { args: [params: { sectionId: string }]; result: SectionConfig | null }
  [PersonalityChannels.saveSectionConfig]: { args: [params: { sectionId: string; update: SectionConfigUpdate }]; result: SectionConfig }

  // ---- Context Menu (raw) ----
  [ContextMenuChannels.writing]: { args: [writingId: string, writingTitle: string]; result: void }
  [ContextMenuChannels.post]: { args: [postId: string, postTitle: string]; result: void }
}

/**
 * Channels using ipcRenderer.send / ipcMain.on (fire-and-forget).
 * `args` = tuple of arguments after the channel name.
 */
export interface SendChannelMap {
  [AppChannels.playSound]: { args: [] }
  [AppChannels.setTheme]: { args: [theme: string] }
  [AppChannels.contextMenu]: { args: [] }
  [AppChannels.contextMenuEditable]: { args: [] }
  [WindowChannels.minimize]: { args: [] }
  [WindowChannels.maximize]: { args: [] }
  [WindowChannels.close]: { args: [] }
  [WindowChannels.popupMenu]: { args: [] }
  [AgentChannels.cancel]: { args: [runId: string] }
  [PipelineChannels.cancel]: { args: [runId: string] }
}

/**
 * Channels for events pushed from main → renderer via webContents.send.
 * `data` = the payload sent with the event.
 */
export interface EventChannelMap {
  [AppChannels.changeLanguage]: { data: string }
  [AppChannels.changeTheme]: { data: string }
  [AppChannels.fileOpened]: { data: string }
  [WindowChannels.maximizeChange]: { data: boolean }
  [WindowChannels.fullScreenChange]: { data: boolean }
  [WmChannels.stateChanged]: { data: WindowManagerState }
  [NetworkChannels.statusChanged]: { data: NetworkConnectionStatus }
  [CronChannels.jobResult]: { data: CronJobResult }
  [LifecycleChannels.event]: { data: LifecycleEvent }
  [FsChannels.watchEvent]: { data: FsWatchEvent }
  [NotificationChannels.event]: { data: NotificationResult }
  [AgentChannels.token]: { data: unknown }
  [AgentChannels.thinking]: { data: unknown }
  [AgentChannels.toolStart]: { data: unknown }
  [AgentChannels.toolEnd]: { data: unknown }
  [AgentChannels.done]: { data: unknown }
  [AgentChannels.error]: { data: unknown }
  [PipelineChannels.event]: { data: PipelineEvent }
  [TaskChannels.event]: { data: TaskEvent }
  [PostsChannels.fileChanged]: { data: PostFileChangeEvent }
  [PostsChannels.watcherError]: { data: WatcherError }
  [DocumentsChannels.fileChanged]: { data: DocumentFileChangeEvent }
  [DocumentsChannels.watcherError]: { data: WatcherError }
  [OutputChannels.fileChanged]: { data: OutputFileChangeEvent }
  [OutputChannels.watcherError]: { data: WatcherError }
  [PersonalityChannels.fileChanged]: { data: PersonalityFileChangeEvent }
  [PersonalityChannels.watcherError]: { data: WatcherError }
  [PersonalityChannels.sectionConfigChanged]: { data: SectionConfigChangeEvent }
  [DirectoriesChannels.changed]: { data: DirectoryEntry[] }
  [ContextMenuChannels.writingAction]: { data: WritingContextMenuAction }
  [ContextMenuChannels.postAction]: { data: PostContextMenuAction }
}
