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
  WorkspaceInfo,
  WorkspaceChangedEvent,
  WorkspaceDeletedEvent,
  DocumentInfo,
  DocumentFileChangeEvent,
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
  WritingContextMenuAction,
  WatcherError,
  AgentSessionConfig,
  AgentRequest,
  AgentStreamEvent,
  AgentSessionSnapshot,
  AgentRunSnapshot,
  AIAgentsManagerStatus,
  AIAgentsDefinitionInfo,
} from '../shared/types/ipc/types'
import type { ProviderSettings, InferenceDefaultsUpdate } from '../shared/types/aiSettings'
import type { IpcResult } from '../shared/types/ipc/ipc-result'

// ---------------------------------------------------------------------------
// Re-export shared types so renderer code can import them from the preload
// declaration rather than reaching into the shared directory directly.
// ---------------------------------------------------------------------------
export type {
  WorkspaceInfo,
  WorkspaceChangedEvent,
  WorkspaceDeletedEvent,
  DocumentInfo,
  DocumentFileChangeEvent,
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
  WritingContextMenuAction,
  WatcherError,
  AgentSessionConfig,
  AgentRequest,
  AgentStreamEvent,
  AgentSessionSnapshot,
  AgentRunSnapshot,
  AIAgentsManagerStatus,
  AIAgentsDefinitionInfo,
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

/** Workspace folder selection, recent workspaces, and document/directory/output management */
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
  // -------------------------------------------------------------------------
  // Document import, download, and file-watch events
  // -------------------------------------------------------------------------
  importFiles: () => Promise<DocumentInfo[]>
  importByPaths: (paths: string[]) => Promise<DocumentInfo[]>
  downloadFromUrl: (url: string) => Promise<DocumentInfo>
  loadDocuments: () => Promise<DocumentInfo[]>
  deleteDocument: (id: string) => Promise<void>
  onDocumentFileChange: (callback: (event: DocumentFileChangeEvent) => void) => () => void
  onDocumentWatcherError: (callback: (error: WatcherError) => void) => () => void
  // -------------------------------------------------------------------------
  // Indexed directory management
  // -------------------------------------------------------------------------
  listDirectories: () => Promise<DirectoryEntry[]>
  addDirectory: (dirPath: string) => Promise<DirectoryEntry>
  addDirectories: (dirPaths: string[]) => Promise<DirectoryAddManyResult>
  removeDirectory: (id: string) => Promise<boolean>
  validateDirectory: (dirPath: string) => Promise<DirectoryValidationResult>
  markDirectoryIndexed: (id: string, isIndexed: boolean) => Promise<boolean>
  onDirectoriesChanged: (callback: (directories: DirectoryEntry[]) => void) => () => void
  // -------------------------------------------------------------------------
  // Output file management (posts and writings)
  // -------------------------------------------------------------------------
  saveOutput: (input: SaveOutputInput) => Promise<SaveOutputResult>
  loadOutputs: () => Promise<OutputFile[]>
  loadOutputsByType: (type: string) => Promise<OutputFile[]>
  loadOutput: (params: { type: string; id: string }) => Promise<OutputFile | null>
  updateOutput: (params: OutputUpdateParams) => Promise<void>
  deleteOutput: (params: { type: string; id: string }) => Promise<void>
  onOutputFileChange: (callback: (event: OutputFileChangeEvent) => void) => () => void
  onOutputWatcherError: (callback: (error: WatcherError) => void) => () => void
}

/** Background task queue */
export interface  TasksManagerApi {
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

/** AIAgentsManager — session/run management and streaming */
export interface AgentManagerAPI {
  listAgents: () => Promise<IpcResult<AIAgentsDefinitionInfo[]>>
  getAgent: (agentId: string) => Promise<IpcResult<AIAgentsDefinitionInfo | undefined>>
  getStatus: () => Promise<IpcResult<AIAgentsManagerStatus>>
  listSessions: () => Promise<IpcResult<AgentSessionSnapshot[]>>
  getSession: (sessionId: string) => Promise<IpcResult<AgentSessionSnapshot | undefined>>
  listActiveRuns: () => Promise<IpcResult<AgentRunSnapshot[]>>
  createSession: (agentId: string, config?: Partial<AgentSessionConfig>) => Promise<IpcResult<string>>
  destroySession: (sessionId: string) => Promise<IpcResult<void>>
  cancelRun: (runId: string) => Promise<IpcResult<void>>
  cancelSession: (sessionId: string) => Promise<IpcResult<void>>
  startStreaming: (sessionId: string, request: AgentRequest, options?: { windowId?: number }) => Promise<IpcResult<string>>
  onEvent: (callback: (event: AgentStreamEvent) => void) => () => void
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
    tasksManager: TasksManagerApi
    agentManager: AgentManagerAPI
  }
}
