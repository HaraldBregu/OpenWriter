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
  WorkspaceInfo,
  WorkspaceChangedEvent,
  WorkspaceDeletedEvent,
  TaskSubmitPayload,
  TaskInfo,
  TaskEvent,
  TaskQueueStatus,
  TaskPriority,
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
  WatcherError,
} from './types'

// ===========================================================================
// Channel Name Constants (grouped by domain)
// ===========================================================================

export const WorkspaceChannels = {
  selectFolder: 'workspace:select-folder',
  getCurrent: 'workspace-get-current',
  setCurrent: 'workspace-set-current',
  getRecent: 'workspace-get-recent',
  clear: 'workspace-clear',
  directoryExists: 'workspace-directory-exists',
  removeRecent: 'workspace-remove-recent',
  changed: 'workspace:changed',
  deleted: 'workspace:deleted',
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

export const TaskChannels = {
  submit: 'task:submit',
  cancel: 'task:cancel',
  list: 'task:list',
  event: 'task:event',
  pause: 'task:pause',
  resume: 'task:resume',
  updatePriority: 'task:update-priority',
  getResult: 'task:get-result',
  queueStatus: 'task:queue-status',
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

export const AppChannels = {
  playSound: 'play-sound',
  setTheme: 'set-theme',
  contextMenu: 'context-menu',
  contextMenuEditable: 'context-menu-editable',
  changeLanguage: 'change-language',
  changeTheme: 'change-theme',
  fileOpened: 'file-opened',
  // Writing context menu (formerly ContextMenuChannels)
  showWritingContextMenu: 'context-menu:writing',
  writingContextMenuAction: 'context-menu:writing-action',
  // Store / AI model settings (merged from StoreChannels)
  getAllProviderSettings: 'store-get-all-provider-settings',
  getProviderSettings: 'store-get-provider-settings',
  setProviderSettings: 'store-set-provider-settings',
  setInferenceDefaults: 'store-set-inference-defaults',
  /** @deprecated Use getAllProviderSettings instead */
  getAllModelSettings: 'store-get-all-model-settings',
  /** @deprecated Use getProviderSettings instead */
  getModelSettings: 'store-get-model-settings',
  /** @deprecated Use setProviderSettings instead */
  setSelectedModel: 'store-set-selected-model',
  /** @deprecated Use setProviderSettings instead */
  setApiToken: 'store-set-api-token',
  /** @deprecated Use setProviderSettings instead */
  setModelSettings: 'store-set-model-settings',
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
  // ---- App / Store (IpcResult-wrapped) ----
  [AppChannels.getAllProviderSettings]: { args: []; result: Record<string, ProviderSettings> }
  [AppChannels.getProviderSettings]: { args: [providerId: string]; result: ProviderSettings | null }
  [AppChannels.setProviderSettings]: { args: [providerId: string, settings: ProviderSettings]; result: void }
  [AppChannels.setInferenceDefaults]: { args: [providerId: string, update: InferenceDefaultsUpdate]; result: void }
  [AppChannels.getAllModelSettings]: { args: []; result: Record<string, LegacyModelSettings> }
  [AppChannels.getModelSettings]: { args: [providerId: string]; result: LegacyModelSettings | null }
  [AppChannels.setSelectedModel]: { args: [providerId: string, modelId: string]; result: void }
  [AppChannels.setApiToken]: { args: [providerId: string, token: string]; result: void }
  [AppChannels.setModelSettings]: { args: [providerId: string, settings: LegacyModelSettings]; result: void }

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

  // ---- Task (IpcResult-wrapped via registerQuery/registerCommand) ----
  [TaskChannels.submit]: { args: [payload: TaskSubmitPayload]; result: { taskId: string } }
  [TaskChannels.cancel]: { args: [taskId: string]; result: boolean }
  [TaskChannels.list]: { args: []; result: TaskInfo[] }
  [TaskChannels.pause]: { args: [taskId: string]; result: boolean }
  [TaskChannels.resume]: { args: [taskId: string]; result: boolean }
  [TaskChannels.updatePriority]: { args: [taskId: string, priority: TaskPriority]; result: boolean }
  [TaskChannels.getResult]: { args: [taskId: string]; result: TaskInfo | null }
  [TaskChannels.queueStatus]: { args: []; result: TaskQueueStatus }

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

  // ---- App — writing context menu (raw invoke) ----
  [AppChannels.showWritingContextMenu]: { args: [writingId: string, writingTitle: string]; result: void }
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
  [WorkspaceChannels.changed]: { data: WorkspaceChangedEvent }
  [WorkspaceChannels.deleted]: { data: WorkspaceDeletedEvent }
  [TaskChannels.event]: { data: TaskEvent }
  [DocumentsChannels.fileChanged]: { data: DocumentFileChangeEvent }
  [DocumentsChannels.watcherError]: { data: WatcherError }
  [OutputChannels.fileChanged]: { data: OutputFileChangeEvent }
  [OutputChannels.watcherError]: { data: WatcherError }
  [PersonalityChannels.fileChanged]: { data: PersonalityFileChangeEvent }
  [PersonalityChannels.watcherError]: { data: WatcherError }
  [PersonalityChannels.sectionConfigChanged]: { data: SectionConfigChangeEvent }
  [DirectoriesChannels.changed]: { data: DirectoryEntry[] }
  [AppChannels.writingContextMenuAction]: { data: WritingContextMenuAction }
}
