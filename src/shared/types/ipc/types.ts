// ---------------------------------------------------------------------------
// Shared IPC Data Types
// ---------------------------------------------------------------------------
// Single source of truth for all data shapes exchanged over IPC.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---- Cron -----------------------------------------------------------------

export interface CronJobConfig {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  description?: string
}

export interface CronJobStatus {
  id: string
  name: string
  schedule: string
  enabled: boolean
  running: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  description?: string
  humanReadable?: string
}

export interface CronJobResult {
  id: string
  timestamp: Date
  success: boolean
  message?: string
  data?: unknown
}

export interface CronValidationResult {
  valid: boolean
  description?: string
  error?: string
}

// ---- Workspace ------------------------------------------------------------

export interface WorkspaceInfo {
  path: string
  lastOpened: number
}

export interface WorkspaceChangedEvent {
  currentPath: string | null
  previousPath: string | null
}

// ---- Agent ----------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentSessionConfig {
  sessionId: string
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

export interface AgentSessionInfo {
  sessionId: string
  providerId: string
  modelId: string
  createdAt: number
  lastActivity: number
  isActive: boolean
  messageCount: number
  metadata?: Record<string, unknown>
}

export interface AgentRunOptions {
  sessionId: string
  runId: string
  messages: ChatMessage[]
  providerId: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface AgentStatusInfo {
  totalSessions: number
  activeSessions: number
  totalMessages: number
}

// ---- Pipeline -------------------------------------------------------------

export interface PipelineInput {
  prompt: string
  context?: Record<string, unknown>
}

export interface PipelineEvent {
  type: 'token' | 'thinking' | 'done' | 'error'
  data: unknown
}

export interface PipelineActiveRun {
  runId: string
  agentName: string
  startedAt: number
}

// ---- Task -----------------------------------------------------------------

export type TaskPriority = 'low' | 'normal' | 'high'

export interface TaskSubmitOptions {
  priority?: TaskPriority
  timeoutMs?: number
  windowId?: number
}

export interface TaskSubmitPayload<TInput = unknown> {
  type: string
  input: TInput
  options?: TaskSubmitOptions
}

export interface TaskInfo {
  taskId: string
  type: string
  status: string
  priority: string
  startedAt?: number
  completedAt?: number
  windowId?: number
  error?: string
}

export type TaskEvent =
  | { type: 'queued'; data: { taskId: string; position: number } }
  | { type: 'started'; data: { taskId: string } }
  | { type: 'progress'; data: { taskId: string; percent: number; message?: string; detail?: unknown } }
  | { type: 'completed'; data: { taskId: string; result: unknown; durationMs: number } }
  | { type: 'error'; data: { taskId: string; message: string; code?: string } }
  | { type: 'cancelled'; data: { taskId: string } }
  | { type: 'stream'; data: { taskId: string; token: string } }

// ---- Posts ----------------------------------------------------------------

export interface PostData {
  id: string
  title: string
  blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
  category: string
  tags: string[]
  visibility: string
  createdAt: number
  updatedAt: number
}

export interface PostSyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors?: Array<{ postId: string; error: string }>
}

export interface PostFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  postId: string
  filePath: string
  timestamp: number
}

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

export type OutputType = 'posts' | 'writings'

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
  blocks: Array<{ name: string; content: string; createdAt: string; updatedAt: string }>
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
  blocks: Array<{ name: string; content: string; createdAt?: string; filetype?: 'markdown'; type?: 'content' }>
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

export interface PostContextMenuAction {
  action: string
  postId: string
}

// ---- Common ---------------------------------------------------------------

export interface WatcherError {
  error: string
  timestamp: number
}
