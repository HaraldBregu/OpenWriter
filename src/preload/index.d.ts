import type {
  MediaPermissionStatus,
  MediaDeviceInfo,
  NetworkConnectionStatus,
  NetworkInterfaceInfo,
  NetworkInfo,
  CronJobConfig,
  CronJobStatus,
  CronJobResult,
  LifecycleEvent,
  LifecycleState,
  FileInfo,
  FsWatchEvent,
  DialogResult,
  NotificationOptions,
  NotificationResult,
  ClipboardContent,
  ClipboardImageData,
  WorkspaceInfo,
  PipelineEvent,
  PipelineActiveRun,
  TaskSubmitPayload,
  TaskInfo,
  TaskEvent,
  OutputType,
  BlockContentItem,
  OutputFileMetadata,
  OutputFileBlock,
  OutputFile,
  OutputFileChangeEvent,
  ManagedWindowType,
  ManagedWindowInfo,
  WindowManagerState,
} from '../shared/types/ipc/types'

/** General application utilities */
interface AppApi {
  playSound: () => void
  setTheme: (theme: string) => void
  showContextMenu: () => void
  showContextMenuEditable: () => void
  onLanguageChange: (callback: (lng: string) => void) => () => void
  onThemeChange: (callback: (theme: string) => void) => () => void
  onFileOpened: (callback: (filePath: string) => void) => () => void
  popupMenu: () => void
  getPlatform: () => Promise<string>
}

/** Window controls (minimize / maximize / close / fullscreen) */
interface WindowApi {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  isFullScreen: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void
}

/** Microphone / camera permissions and device enumeration */
interface MediaApi {
  requestMicrophonePermission: () => Promise<MediaPermissionStatus>
  requestCameraPermission: () => Promise<MediaPermissionStatus>
  getMicrophonePermissionStatus: () => Promise<MediaPermissionStatus>
  getCameraPermissionStatus: () => Promise<MediaPermissionStatus>
  getDevices: (type: 'audioinput' | 'videoinput') => Promise<MediaDeviceInfo[]>
}

/** Bluetooth capability queries */
interface BluetoothApi {
  isSupported: () => Promise<boolean>
  getPermissionStatus: () => Promise<string>
  getInfo: () => Promise<{ platform: string; supported: boolean; apiAvailable: boolean }>
}

/** Network connectivity and interface information */
interface NetworkApi {
  isSupported: () => Promise<boolean>
  getConnectionStatus: () => Promise<NetworkConnectionStatus>
  getInterfaces: () => Promise<NetworkInterfaceInfo[]>
  getInfo: () => Promise<NetworkInfo>
  onStatusChange: (callback: (status: NetworkConnectionStatus) => void) => () => void
}

/** Scheduled job management */
interface CronApi {
  getAll: () => Promise<CronJobStatus[]>
  getJob: (id: string) => Promise<CronJobStatus | null>
  start: (id: string) => Promise<boolean>
  stop: (id: string) => Promise<boolean>
  delete: (id: string) => Promise<boolean>
  create: (config: CronJobConfig) => Promise<boolean>
  updateSchedule: (id: string, schedule: string) => Promise<boolean>
  validateExpression: (expression: string) => Promise<{ valid: boolean; description?: string; error?: string }>
  onJobResult: (callback: (result: CronJobResult) => void) => () => void
}

/** App lifecycle state and events */
interface LifecycleApi {
  getState: () => Promise<LifecycleState>
  getEvents: () => Promise<LifecycleEvent[]>
  restart: () => Promise<void>
  onEvent: (callback: (event: LifecycleEvent) => void) => () => void
}

/** Window manager — child / modal / frameless / widget windows */
interface WindowManagerApi {
  getState: () => Promise<WindowManagerState>
  createChild: () => Promise<ManagedWindowInfo>
  createModal: () => Promise<ManagedWindowInfo>
  createFrameless: () => Promise<ManagedWindowInfo>
  createWidget: () => Promise<ManagedWindowInfo>
  closeWindow: (id: number) => Promise<boolean>
  closeAll: () => Promise<void>
  onStateChange: (callback: (state: WindowManagerState) => void) => () => void
}

/** Filesystem operations and directory watching */
interface FileSystemApi {
  openFile: () => Promise<FileInfo | null>
  readFile: (filePath: string) => Promise<FileInfo>
  saveFile: (defaultName: string, content: string) => Promise<{ success: boolean; filePath: string | null }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; filePath: string }>
  selectDirectory: () => Promise<string | null>
  watchDirectory: (dirPath: string) => Promise<boolean>
  unwatchDirectory: (dirPath: string) => Promise<boolean>
  getWatched: () => Promise<string[]>
  onWatchEvent: (callback: (event: FsWatchEvent) => void) => () => void
}

/** Native OS dialog boxes */
interface DialogApi {
  open: () => Promise<DialogResult>
  openDirectory: (multiSelections?: boolean) => Promise<DialogResult>
  save: () => Promise<DialogResult>
  message: (message: string, detail: string, buttons: string[]) => Promise<DialogResult>
  error: (title: string, content: string) => Promise<DialogResult>
}

/** Desktop notifications */
interface NotificationApi {
  isSupported: () => Promise<boolean>
  show: (options: NotificationOptions) => Promise<string>
  onEvent: (callback: (result: NotificationResult) => void) => () => void
}

/** Clipboard read / write operations */
interface ClipboardApi {
  writeText: (text: string) => Promise<boolean>
  readText: () => Promise<string>
  writeHTML: (html: string) => Promise<boolean>
  readHTML: () => Promise<string>
  writeImage: (dataURL: string) => Promise<boolean>
  readImage: () => Promise<ClipboardImageData | null>
  clear: () => Promise<boolean>
  getContent: () => Promise<ClipboardContent | null>
  getFormats: () => Promise<string[]>
  hasText: () => Promise<boolean>
  hasImage: () => Promise<boolean>
  hasHTML: () => Promise<boolean>
}

/** Persisted AI model settings */
interface StoreApi {
  getAllProviderSettings: () => Promise<Record<string, { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }>>
  getProviderSettings: (providerId: string) => Promise<{ selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean } | null>
  setProviderSettings: (providerId: string, settings: { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }) => Promise<void>
  setInferenceDefaults: (providerId: string, update: { temperature?: number; maxTokens?: number | null; reasoning?: boolean }) => Promise<void>
  getAllModelSettings: () => Promise<Record<string, { selectedModel: string; apiToken: string }>>
  getModelSettings: (providerId: string) => Promise<{ selectedModel: string; apiToken: string } | null>
  setSelectedModel: (providerId: string, modelId: string) => Promise<void>
  setApiToken: (providerId: string, token: string) => Promise<void>
  setModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }) => Promise<void>
}

/** Workspace folder selection and recent workspaces */
interface WorkspaceApi {
  selectFolder: () => Promise<string | null>
  getCurrent: () => Promise<string | null>
  setCurrent: (workspacePath: string) => Promise<void>
  getRecent: () => Promise<WorkspaceInfo[]>
  clear: () => Promise<void>
  directoryExists: (directoryPath: string) => Promise<boolean>
  removeRecent: (workspacePath: string) => Promise<void>
}

interface PostData {
  id: string
  title: string
  blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
  category: string
  tags: string[]
  visibility: string
  createdAt: number
  updatedAt: number
}

interface PostSyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors?: Array<{ postId: string; error: string }>
}

interface PostFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  postId: string
  filePath: string
  timestamp: number
}

/** Post sync and file-watch events */
interface PostsApi {
  syncToWorkspace: (posts: PostData[]) => Promise<PostSyncResult>
  update: (post: PostData) => Promise<void>
  delete: (postId: string) => Promise<void>
  loadFromWorkspace: () => Promise<PostData[]>
  onFileChange: (callback: (event: PostFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
}

interface DocumentInfo {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  importedAt: number
  lastModified: number
}

interface DocumentFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  fileId: string
  filePath: string
  timestamp: number
}

/** Document import, download, and file-watch events */
interface DocumentsApi {
  importFiles: () => Promise<DocumentInfo[]>
  importByPaths: (paths: string[]) => Promise<DocumentInfo[]>
  downloadFromUrl: (url: string) => Promise<DocumentInfo>
  loadAll: () => Promise<DocumentInfo[]>
  delete: (id: string) => Promise<void>
  onFileChange: (callback: (event: DocumentFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
}

interface AgentSessionConfig {
  sessionId: string
  providerId: string
  modelId?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

interface AgentSessionInfo {
  sessionId: string
  providerId: string
  modelId: string
  createdAt: number
  lastActivity: number
  isActive: boolean
  messageCount: number
  metadata?: Record<string, unknown>
}

interface AgentRunSessionOptions {
  sessionId: string
  runId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  providerId: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

interface AgentStatus {
  totalSessions: number
  activeSessions: number
  totalMessages: number
}

/** AI agent execution and session management */
interface AgentApi {
  run: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, runId: string, providerId: string) => Promise<void>
  cancel: (runId: string) => void
  onEvent: (callback: (eventType: string, data: unknown) => void) => () => void
  createSession: (config: AgentSessionConfig) => Promise<AgentSessionInfo>
  destroySession: (sessionId: string) => Promise<boolean>
  getSession: (sessionId: string) => Promise<AgentSessionInfo | null>
  listSessions: () => Promise<AgentSessionInfo[]>
  clearSessions: () => Promise<number>
  runSession: (options: AgentRunSessionOptions) => Promise<void>
  cancelSession: (sessionId: string) => Promise<boolean>
  getStatus: () => Promise<AgentStatus>
  isRunning: (runId: string) => Promise<boolean>
}

/** Application-specific context menus */
interface ContextMenuApi {
  showWriting: (writingId: string, writingTitle: string) => Promise<void>
  onWritingAction: (callback: (data: { action: string; writingId: string }) => void) => () => void
  showPost: (postId: string, postTitle: string) => Promise<void>
  onPostAction: (callback: (data: { action: string; postId: string }) => void) => () => void
}

interface DirectoryInfo {
  id: string
  path: string
  addedAt: number
  isIndexed: boolean
  lastIndexedAt?: number
}

interface AddManyResult {
  added: DirectoryInfo[]
  errors: Array<{ path: string; error: string }>
}

/** Indexed directory management */
interface DirectoriesApi {
  list: () => Promise<DirectoryInfo[]>
  add: (dirPath: string) => Promise<DirectoryInfo>
  addMany: (dirPaths: string[]) => Promise<AddManyResult>
  remove: (id: string) => Promise<boolean>
  validate: (dirPath: string) => Promise<{ valid: boolean; error?: string }>
  markIndexed: (id: string, isIndexed: boolean) => Promise<boolean>
  onChanged: (callback: (directories: DirectoryInfo[]) => void) => () => void
}

interface PersonalitySaveInput {
  sectionId: string
  content: string
  metadata?: Record<string, unknown>
}

interface PersonalitySaveResult {
  id: string
  path: string
  savedAt: number
}

interface PersonalityFile {
  id: string
  sectionId: string
  path: string
  metadata: {
    title: string
    provider: string
    model: string
    [key: string]: unknown
  }
  content: string
  savedAt: number
}

interface PersonalitySectionConfig {
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

interface PersonalitySectionConfigUpdate {
  provider?: string
  model?: string
  temperature?: number | null
  maxTokens?: number | null
  reasoning?: boolean
  displayName?: string
  description?: string
}

interface PersonalitySectionConfigChangeEvent {
  sectionId: string
  config: PersonalitySectionConfig | null
  timestamp: number
}

interface PersonalityFileChangeEvent {
  type: 'added' | 'changed' | 'removed'
  sectionId: string
  fileId: string
  filePath: string
  timestamp: number
}

/** Personality / conversation file management */
interface PersonalityApi {
  save: (input: PersonalitySaveInput) => Promise<PersonalitySaveResult>
  loadAll: () => Promise<PersonalityFile[]>
  loadOne: (params: { sectionId: string; id: string }) => Promise<PersonalityFile | null>
  delete: (params: { sectionId: string; id: string }) => Promise<void>
  onFileChange: (callback: (event: PersonalityFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
  loadSectionConfig: (params: { sectionId: string }) => Promise<PersonalitySectionConfig | null>
  saveSectionConfig: (params: { sectionId: string; update: PersonalitySectionConfigUpdate }) => Promise<PersonalitySectionConfig>
  onSectionConfigChange: (callback: (event: PersonalitySectionConfigChangeEvent) => void) => () => void
}

interface OutputBlockInput {
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

interface OutputSaveInput {
  type: string
  blocks: OutputBlockInput[]
  metadata?: Record<string, unknown>
}

interface OutputSaveResult {
  id: string
  path: string
  savedAt: number
}

interface OutputUpdateParams {
  type: string
  id: string
  blocks: OutputBlockInput[]
  metadata: Record<string, unknown>
}

/** Output file management for posts and writings */
interface OutputApi {
  save: (input: OutputSaveInput) => Promise<OutputSaveResult>
  loadAll: () => Promise<OutputFile[]>
  loadByType: (type: string) => Promise<OutputFile[]>
  loadOne: (params: { type: string; id: string }) => Promise<OutputFile | null>
  update: (params: OutputUpdateParams) => Promise<void>
  delete: (params: { type: string; id: string }) => Promise<void>
  onFileChange: (callback: (event: OutputFileChangeEvent) => void) => () => void
  onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
}

interface TaskSubmitResult {
  success: true
  data: { taskId: string }
}

interface TaskSubmitError {
  success: false
  error: { code: string; message: string }
}

interface TaskListResult {
  success: true
  data: TaskInfo[]
}

interface TaskListError {
  success: false
  error: { code: string; message: string }
}

interface TaskCancelResult {
  success: true
  data: boolean
}

interface TaskCancelError {
  success: false
  error: { code: string; message: string }
}

/** Background task queue */
interface TaskApi {
  submit: (type: string, input: unknown, options?: TaskSubmitPayload['options']) => Promise<TaskSubmitResult | TaskSubmitError>
  cancel: (taskId: string) => Promise<TaskCancelResult | TaskCancelError>
  list: () => Promise<TaskListResult | TaskListError>
  onEvent: (callback: (event: TaskEvent) => void) => () => void
}

interface InferenceInput {
  prompt: string
  context?: Record<string, unknown>
}

interface InferenceResult {
  success: true
  data: { runId: string }
}

interface InferenceError {
  success: false
  error: { code: string; message: string }
}

interface ListAgentsResult {
  success: true
  data: string[]
}

interface ListAgentsError {
  success: false
  error: { code: string; message: string }
}

interface ListRunsResult {
  success: true
  data: PipelineActiveRun[]
}

interface ListRunsError {
  success: false
  error: { code: string; message: string }
}

/** AI inference API (pipeline-based) */
interface AiApi {
  inference: (agentName: string, input: InferenceInput) => Promise<InferenceResult | InferenceError>
  cancel: (runId: string) => void
  onEvent: (callback: (event: PipelineEvent) => void) => () => void
  listAgents: () => Promise<ListAgentsResult | ListAgentsError>
  listRuns: () => Promise<ListRunsResult | ListRunsError>
}

interface Window {
  app: AppApi
  win?: WindowApi
  media: MediaApi
  bluetooth: BluetoothApi
  network: NetworkApi
  cron: CronApi
  lifecycle: LifecycleApi
  wm: WindowManagerApi
  fs: FileSystemApi
  dialog: DialogApi
  notification: NotificationApi
  clipboard: ClipboardApi
  store: StoreApi
  workspace: WorkspaceApi
  posts: PostsApi
  documents: DocumentsApi
  agent: AgentApi
  contextMenu: ContextMenuApi
  directories: DirectoriesApi
  personality: PersonalityApi
  output: OutputApi
  task?: TaskApi
  ai: AiApi
}
