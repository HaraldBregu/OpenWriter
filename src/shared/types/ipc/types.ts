// ---------------------------------------------------------------------------
// Shared IPC Data Types
// ---------------------------------------------------------------------------
// Single source of truth for all data shapes exchanged over IPC.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---- Workspace ------------------------------------------------------------

export interface WorkspaceInfo {
  path: string
  lastOpened: number
}

export interface WorkspaceChangedEvent {
  currentPath: string | null
  previousPath: string | null
}

/**
 * Event emitted when the current workspace folder is detected as deleted,
 * renamed, or otherwise inaccessible while the application is running.
 */
export interface WorkspaceDeletedEvent {
  /** The path that was previously set as the workspace */
  deletedPath: string
  /** Human-readable reason for the event */
  reason: 'deleted' | 'inaccessible' | 'renamed'
  /** Timestamp when the deletion was detected */
  timestamp: number
}

// ---- Task -----------------------------------------------------------------

export type TaskPriority = 'low' | 'normal' | 'high'

export interface TaskSubmitOptions {
  taskId?: string
  priority?: TaskPriority
  timeoutMs?: number
  windowId?: number
}

export interface TaskSubmitPayload<TInput = unknown> {
  type: string
  input: TInput
  options?: TaskSubmitOptions
}

export type TaskStatus = 'queued' | 'paused' | 'running' | 'completed' | 'error' | 'cancelled'

export interface TaskInfo {
  taskId: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  startedAt?: number
  completedAt?: number
  windowId?: number
  error?: string
  queuePosition?: number
  durationMs?: number
}

/** Queue metrics returned by task:queue-status */
export interface TaskQueueStatus {
  queued: number
  running: number
  completed: number
}

export type TaskEvent =
  | { type: 'queued'; data: { taskId: string; position: number } }
  | { type: 'started'; data: { taskId: string } }
  | { type: 'progress'; data: { taskId: string; percent: number; message?: string; detail?: unknown } }
  | { type: 'completed'; data: { taskId: string; result: unknown; durationMs: number } }
  | { type: 'error'; data: { taskId: string; message: string; code: string } }
  | { type: 'cancelled'; data: { taskId: string } }
  | { type: 'stream'; data: { taskId: string; token: string } }
  | { type: 'paused'; data: { taskId: string } }
  | { type: 'resumed'; data: { taskId: string; position: number } }
  | { type: 'priority-changed'; data: { taskId: string; priority: TaskPriority; position: number } }
  | { type: 'queue-position'; data: { taskId: string; position: number } }

// ---- Documents ------------------------------------------------------------

export interface DocumentInfo {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  importedAt: number
  lastModified: number
}

export interface DocumentFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  fileId: string
  filePath: string
  timestamp: number
}

// ---- Output ---------------------------------------------------------------

export type OutputType = 'writings'

export interface BlockContentItem {
  name: string
  type: 'content'
  filetype: 'markdown'
  createdAt: string
  updatedAt: string
}

export interface OutputFileMetadata {
  title: string
  type: OutputType
  category: string
  tags: string[]
  visibility: string
  provider: string
  model: string
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
  createdAt: string
  updatedAt: string
  content: BlockContentItem[]
}

export interface OutputFileBlock {
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface OutputFile {
  id: string
  type: OutputType
  path: string
  metadata: OutputFileMetadata
  blocks: OutputFileBlock[]
  savedAt: number
}

export interface OutputFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  outputType: string
  fileId: string
  filePath: string
  timestamp: number
}

export interface SaveOutputInput {
  type: string
  blocks: Array<{
    name: string
    content: string
    createdAt: string
    updatedAt: string
  }>
  metadata?: Record<string, unknown>
}

export interface SaveOutputResult {
  id: string
  path: string
  savedAt: number
}

export interface OutputUpdateParams {
  type: string
  id: string
  blocks: Array<{
    name: string
    content: string
    createdAt?: string
    filetype?: 'markdown'
    type?: 'content'
    blockType?: 'paragraph' | 'heading' | 'media'
    blockLevel?: 1 | 2 | 3 | 4 | 5 | 6
    mediaSrc?: string
    mediaAlt?: string
  }>
  metadata: Record<string, unknown>
}

// ---- Directories ----------------------------------------------------------

export interface DirectoryEntry {
  id: string
  path: string
  addedAt: number
  isIndexed: boolean
  lastIndexedAt?: number
}

export interface DirectoryAddManyResult {
  added: DirectoryEntry[]
  errors: Array<{ path: string; error: string }>
}

export interface DirectoryValidationResult {
  valid: boolean
  error?: string
}

// ---- Personality ----------------------------------------------------------

export interface PersonalityFileMetadata {
  title: string
  provider: string
  model: string
  [key: string]: unknown
}

export interface PersonalityFile {
  id: string
  sectionId: string
  path: string
  metadata: PersonalityFileMetadata
  content: string
  savedAt: number
}

export interface SavePersonalityInput {
  sectionId: string
  content: string
  metadata?: Record<string, unknown>
}

export interface SavePersonalityResult {
  id: string
  path: string
  savedAt: number
}

export interface SectionConfig {
  schemaVersion: number
  provider: string
  model: string
  temperature?: number | null
  maxTokens?: number | null
  reasoning?: boolean
  displayName?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface SectionConfigUpdate {
  provider?: string
  model?: string
  temperature?: number | null
  maxTokens?: number | null
  reasoning?: boolean
  displayName?: string
  description?: string
}

export interface PersonalityFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  sectionId: string
  fileId: string
  filePath: string
  timestamp: number
}

export interface SectionConfigChangeEvent {
  sectionId: string
  config: SectionConfig | null
  timestamp: number
}

// ---- Context Menu ---------------------------------------------------------

export interface WritingContextMenuAction {
  action: string
  writingId: string
}

// ---- Common ---------------------------------------------------------------

export interface WatcherError {
  error: string
  timestamp: number
}

// ---- AIAgentsManager ------------------------------------------------------

export interface AgentSessionConfig {
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  maxHistoryMessages?: number
  metadata?: Record<string, unknown>
}

export interface AgentRequest {
  prompt: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  providerId?: string
  modelId?: string
  temperature?: number
  maxTokens?: number
}

export type AgentStreamEvent =
  | { type: 'token'; token: string; runId: string }
  | { type: 'thinking'; content: string; runId: string }
  | { type: 'done'; content: string; tokenCount: number; runId: string }
  | { type: 'error'; error: string; code: string; runId: string }

export interface AgentSessionSnapshot {
  sessionId: string
  providerId: string
  modelId: string
  systemPrompt: string
  temperature: number
  maxTokens: number | undefined
  maxHistoryMessages: number
  historyLength: number
  activeRunIds: string[]
  createdAt: number
  lastActivity: number
  metadata?: Record<string, unknown>
}

export interface AgentRunSnapshot {
  runId: string
  sessionId: string
  startedAt: number
}

export interface AIAgentsManagerStatus {
  totalSessions: number
  activeSessions: number
  activeRuns: number
}

export interface AIAgentsDefinitionInfo {
  id: string
  name: string
  description: string
  category: 'writing' | 'editing' | 'analysis' | 'utility'
  inputHints?: {
    label: string
    placeholder: string
    multiline?: boolean
  }
}

