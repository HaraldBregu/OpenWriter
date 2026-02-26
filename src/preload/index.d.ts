// ---------------------------------------------------------------------------
// Preload API Type Declarations
// ---------------------------------------------------------------------------
// These declarations extend the browser's global Window interface so that
// renderer code can access window.app, window.win, etc. with full type safety.
//
// The interface Window block MUST live inside `declare global` so TypeScript
// treats this as a module-augmentation rather than a standalone interface
// declaration.  Without `declare global` the renderer tsconfig (which includes
// this file as a global type) cannot merge it into `Window & typeof globalThis`.
// ---------------------------------------------------------------------------

import type {
  CronJobConfig,
  CronJobStatus,
  CronJobResult,
  CronValidationResult,
  WorkspaceInfo,
  WorkspaceChangedEvent,
  WorkspaceDeletedEvent,
  DocumentInfo,
  DocumentFileChangeEvent,
  AgentSessionConfig,
  AgentSessionInfo,
  AgentRunOptions,
  AgentStatusInfo,
  PipelineEvent,
  PipelineActiveRun,
  PipelineInput,
  TaskSubmitPayload,
  TaskInfo,
  TaskEvent,
  TaskPriority,
  TaskQueueStatus,
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
} from '../shared/types/ipc/types'
import type { ProviderSettings, InferenceDefaultsUpdate } from '../shared/types/aiSettings'
import type { IpcResult } from '../shared/types/ipc/ipc-result'

// ---------------------------------------------------------------------------
// Re-export shared types so renderer code can import them from the preload
// declaration rather than reaching into the shared directory directly.
// ---------------------------------------------------------------------------
export type {
  CronJobConfig,
  CronJobStatus,
  CronJobResult,
  CronValidationResult,
  WorkspaceInfo,
  WorkspaceChangedEvent,
  WorkspaceDeletedEvent,
  DocumentInfo,
  DocumentFileChangeEvent,
  AgentSessionConfig,
  AgentSessionInfo,
  AgentRunOptions,
  AgentStatusInfo,
  PipelineEvent,
  PipelineActiveRun,
  PipelineInput,
  TaskSubmitPayload,
  TaskInfo,
  TaskEvent,
  TaskPriority,
  TaskQueueStatus,
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
  ProviderSettings,
  InferenceDefaultsUpdate,
  IpcResult,
}

// ---------------------------------------------------------------------------
// API namespace interfaces
// ---------------------------------------------------------------------------

/** General application utilities — also includes all persisted AI model settings (store) methods. */
export interface AppApi {
  playSound: () => void
  setTheme: (theme: string) => void
  showContextMenu: () => void
  showContextMenuEditable: () => void
  onLanguageChange: (callback: (lng: string) => void) => () => void
  onThemeChange: (callback: (theme: string) => void) => () => void
  onFileOpened: (callback: (filePath: string) => void) => () => void
  popupMenu: () => void
  getPlatform: () => Promise<string>
  /** Show the writing-item context menu for the given writing. */
  showWriting: (writingId: string, writingTitle: string) => Promise<void>
  /** Subscribe to writing context-menu action events. */
  onWritingAction: (callback: (data: WritingContextMenuAction) => void) => () => void
  // ---------------------------------------------------------------------------
  // Persisted AI model settings (previously window.store)
  // ---------------------------------------------------------------------------
  getAllProviderSettings: () => Promise<Record<string, ProviderSettings>>
  getProviderSettings: (providerId: string) => Promise<ProviderSettings | null>
  setProviderSettings: (providerId: string, settings: ProviderSettings) => Promise<void>
  setInferenceDefaults: (providerId: string, update: InferenceDefaultsUpdate) => Promise<void>
  /** @deprecated Use getAllProviderSettings instead */
  getAllModelSettings: () => Promise<Record<string, { selectedModel: string; apiToken: string }>>
  /** @deprecated Use getProviderSettings instead */
  getModelSettings: (providerId: string) => Promise<{ selectedModel: string; apiToken: string } | null>
  /** @deprecated Use setProviderSettings instead */
  setSelectedModel: (providerId: string, modelId: string) => Promise<void>
  /** @deprecated Use setProviderSettings instead */
  setApiToken: (providerId: string, token: string) => Promise<void>
  /** @deprecated Use setProviderSettings instead */
  setModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }) => Promise<void>
}

/** Window controls (minimize / maximize / close / fullscreen) */
export interface WindowApi {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  isFullScreen: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void
}

/** Workspace folder selection and recent workspaces */
export interface WorkspaceApi {
  selectFolder: () => Promise<string | null>
  getCurrent: () => Promise<string | null>
  setCurrent: (workspacePath: string) => Promise<void>
  getRecent: () => Promise<WorkspaceInfo[]>
  clear: () => Promise<void>
  directoryExists: (directoryPath: string) => Promise<boolean>
  removeRecent: (workspacePath: string) => Promise<void>
  onChange: (callback: (event: WorkspaceChangedEvent) => void) => () => void
  /** Subscribe to workspace deletion events (folder deleted/moved while app is open) */
  onDeleted: (callback: (event: WorkspaceDeletedEvent) => void) => () => void
  /** Document import, download, and file-watch events */
  documents: DocumentsApi
  /** Indexed directory management */
  directories: DirectoriesApi
  /** Personality / conversation file management */
  personality: PersonalityApi
  /** Output file management (posts and writings) */
  output: OutputApi
}

/** Document import, download, and file-watch events */
export interface DocumentsApi {
  importFiles: () => Promise<DocumentInfo[]>
  importByPaths: (paths: string[]) => Promise<DocumentInfo[]>
  downloadFromUrl: (url: string) => Promise<DocumentInfo>
  loadAll: () => Promise<DocumentInfo[]>
  delete: (id: string) => Promise<void>
  onFileChange: (callback: (event: DocumentFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: WatcherError) => void) => () => void
}

/** Indexed directory management */
export interface DirectoriesApi {
  list: () => Promise<DirectoryEntry[]>
  add: (dirPath: string) => Promise<DirectoryEntry>
  addMany: (dirPaths: string[]) => Promise<DirectoryAddManyResult>
  remove: (id: string) => Promise<boolean>
  validate: (dirPath: string) => Promise<DirectoryValidationResult>
  markIndexed: (id: string, isIndexed: boolean) => Promise<boolean>
  onChanged: (callback: (directories: DirectoryEntry[]) => void) => () => void
}

/** Personality / conversation file management */
export interface PersonalityApi {
  save: (input: SavePersonalityInput) => Promise<SavePersonalityResult>
  loadAll: () => Promise<PersonalityFile[]>
  loadOne: (params: { sectionId: string; id: string }) => Promise<PersonalityFile | null>
  delete: (params: { sectionId: string; id: string }) => Promise<void>
  onFileChange: (callback: (event: PersonalityFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: WatcherError) => void) => () => void
  loadSectionConfig: (params: { sectionId: string }) => Promise<SectionConfig | null>
  saveSectionConfig: (params: { sectionId: string; update: SectionConfigUpdate }) => Promise<SectionConfig>
  onSectionConfigChange: (callback: (event: SectionConfigChangeEvent) => void) => () => void
}

/** Output file management (posts and writings) */
export interface OutputApi {
  save: (input: SaveOutputInput) => Promise<SaveOutputResult>
  loadAll: () => Promise<OutputFile[]>
  loadByType: (type: string) => Promise<OutputFile[]>
  loadOne: (params: { type: string; id: string }) => Promise<OutputFile | null>
  update: (params: OutputUpdateParams) => Promise<void>
  delete: (params: { type: string; id: string }) => Promise<void>
  onFileChange: (callback: (event: OutputFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: WatcherError) => void) => () => void
}

/** Background task queue */
export interface TaskApi {
  submit: (type: string, input: unknown, options?: TaskSubmitPayload['options']) => Promise<IpcResult<{ taskId: string }>>
  cancel: (taskId: string) => Promise<IpcResult<boolean>>
  list: () => Promise<IpcResult<TaskInfo[]>>
  pause: (taskId: string) => Promise<IpcResult<boolean>>
  resume: (taskId: string) => Promise<IpcResult<boolean>>
  updatePriority: (taskId: string, priority: 'low' | 'normal' | 'high') => Promise<IpcResult<boolean>>
  getResult: (taskId: string) => Promise<IpcResult<TaskInfo | null>>
  queueStatus: () => Promise<IpcResult<TaskQueueStatus>>
  onEvent: (callback: (event: TaskEvent) => void) => () => void
}

// ---------------------------------------------------------------------------
// Global Window augmentation
// ---------------------------------------------------------------------------
// IMPORTANT: This must be inside `declare global` so TypeScript can merge
// it with the built-in Window interface in renderer code.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    app: AppApi
    /** Optional: not present in all window types */
    win?: WindowApi
    workspace: WorkspaceApi
    /** Optional: not present in all window types */
    task?: TaskApi
    ai: AiApi
  }
}
