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
  PersonalityFile,
  SavePersonalityInput,
  SavePersonalityResult,
  SectionConfig,
  SectionConfigUpdate,
  PersonalityFileChangeEvent,
  SectionConfigChangeEvent,
  WritingContextMenuAction,
  WatcherError,
  AgentDefinitionInfo,
  AgentSessionConfig,
  AgentRequest,
  AgentStreamEvent,
  AgentSessionSnapshot,
  AgentManagerStatus,
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

/** Workspace folder selection, recent workspaces, and document/directory/personality/output management */
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
  // Personality / conversation file management
  // -------------------------------------------------------------------------
  savePersonality: (input: SavePersonalityInput) => Promise<SavePersonalityResult>
  loadPersonalities: () => Promise<PersonalityFile[]>
  loadPersonality: (params: { sectionId: string; id: string }) => Promise<PersonalityFile | null>
  deletePersonality: (params: { sectionId: string; id: string }) => Promise<void>
  onPersonalityFileChange: (callback: (event: PersonalityFileChangeEvent) => void) => () => void
  onPersonalityWatcherError: (callback: (error: WatcherError) => void) => () => void
  loadSectionConfig: (params: { sectionId: string }) => Promise<SectionConfig | null>
  saveSectionConfig: (params: { sectionId: string; update: SectionConfigUpdate }) => Promise<SectionConfig>
  onSectionConfigChange: (callback: (event: SectionConfigChangeEvent) => void) => () => void
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

/** Named agent registry and streaming AI sessions */
export interface AgentApi {
  /** List all registered named agents as IPC-safe metadata. */
  listAgents: () => Promise<AgentDefinitionInfo[]>
  /** Return AgentManager runtime status (session/run counts). */
  getStatus: () => Promise<AgentManagerStatus>
  /** List all live session snapshots. */
  listSessions: () => Promise<AgentSessionSnapshot[]>
  /**
   * Create a new session from a named agent definition.
   * @param agentId   - Registered agent id (e.g. 'story-writer').
   * @param providerId - Active provider id (e.g. 'openai').
   * @param overrides  - Optional partial config overrides.
   */
  createSession: (
    agentId: string,
    providerId: string,
    overrides?: Partial<AgentSessionConfig>
  ) => Promise<AgentSessionSnapshot>
  /** Destroy a session and cancel its active runs. Returns true if found. */
  destroySession: (sessionId: string) => Promise<boolean>
  /**
   * Start a streaming run on an existing session.
   * Returns the runId immediately; stream events arrive via onEvent().
   */
  startStreaming: (sessionId: string, request: AgentRequest) => Promise<string>
  /** Cancel a single active run. Returns true if the run was found and aborted. */
  cancelRun: (runId: string) => Promise<boolean>
  /** Cancel all active runs for a session. Returns true if any runs were cancelled. */
  cancelSession: (sessionId: string) => Promise<boolean>
  /**
   * Subscribe to streaming events from the main process.
   * Returns an unsubscribe function — call it to stop listening.
   */
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
    /** Optional: not present in all window types */
    task?: TaskApi
    /** Named agent registry and streaming AI sessions */
    agent: AgentApi
  }
}
