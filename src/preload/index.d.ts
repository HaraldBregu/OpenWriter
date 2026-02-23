import { ElectronAPI } from '@electron-toolkit/preload'

type MediaPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted'
type NetworkConnectionStatus = 'online' | 'offline' | 'unknown'

interface MediaDeviceInfo {
  deviceId: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
  label: string
  groupId: string
}

interface NetworkInterfaceInfo {
  name: string
  family: 'IPv4' | 'IPv6'
  address: string
  netmask: string
  mac: string
  internal: boolean
  cidr: string | null
}

interface NetworkInfo {
  platform: string
  supported: boolean
  isOnline: boolean
  interfaceCount: number
}

interface CronJobConfig {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  description?: string
}

interface CronJobStatus {
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

interface CronJobResult {
  id: string
  timestamp: Date
  success: boolean
  message?: string
  data?: unknown
}

interface LifecycleEvent {
  type: string
  timestamp: number
  detail?: string
}

interface LifecycleState {
  isSingleInstance: boolean
  events: LifecycleEvent[]
  appReadyAt: number | null
  platform: string
}

interface FileInfo {
  filePath: string
  fileName: string
  content: string
  size: number
  lastModified: number
}

interface FsWatchEvent {
  eventType: string
  filename: string | null
  directory: string
  timestamp: number
}

interface DialogResult {
  type: string
  timestamp: number
  data: Record<string, unknown>
}

interface NotificationOptions {
  title: string
  body: string
  silent?: boolean
  urgency?: 'normal' | 'critical' | 'low'
}

interface NotificationResult {
  id: string
  title: string
  body: string
  timestamp: number
  action: 'clicked' | 'closed' | 'shown'
}

interface ClipboardContent {
  type: 'text' | 'image' | 'html'
  text?: string
  html?: string
  dataURL?: string
  width?: number
  height?: number
  timestamp: number
}

interface ClipboardImageData {
  dataURL: string
  width: number
  height: number
}

interface WorkspaceInfo {
  path: string
  lastOpened: number
}

interface PipelineEvent {
  type: 'token' | 'thinking' | 'done' | 'error'
  data: unknown
}

interface TaskSubmitPayload {
  type: string
  input: unknown
  options?: {
    priority?: 'low' | 'normal' | 'high'
    timeoutMs?: number
    windowId?: number
  }
}

interface TaskInfo {
  taskId: string
  type: string
  status: string
  priority: string
  startedAt?: number
  completedAt?: number
  windowId?: number
  error?: string
}

interface TaskEvent {
  type: 'queued' | 'started' | 'progress' | 'completed' | 'error' | 'cancelled'
  data: unknown
}

interface PipelineActiveRun {
  runId: string
  agentName: string
  startedAt: number
}

type ManagedWindowType = 'child' | 'modal' | 'frameless' | 'widget'

interface ManagedWindowInfo {
  id: number
  type: ManagedWindowType
  title: string
  createdAt: number
}

interface WindowManagerState {
  windows: ManagedWindowInfo[]
}

declare global {
  interface Window {
    electron: ElectronAPI
    task: {
      submit: (type: string, input: unknown, options?: TaskSubmitPayload['options']) => Promise<{ success: true; data: { taskId: string } } | { success: false; error: { code: string; message: string } }>
      cancel: (taskId: string) => Promise<{ success: true; data: boolean } | { success: false; error: { code: string; message: string } }>
      list: () => Promise<{ success: true; data: TaskInfo[] } | { success: false; error: { code: string; message: string } }>
      onEvent: (callback: (event: TaskEvent) => void) => () => void
    }
    ai: {
      inference: (agentName: string, input: { prompt: string; context?: Record<string, unknown> }) => Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }>
      cancel: (runId: string) => void
      onEvent: (callback: (event: PipelineEvent) => void) => () => void
      listAgents: () => Promise<{ success: true; data: string[] } | { success: false; error: { code: string; message: string } }>
      listRuns: () => Promise<{ success: true; data: PipelineActiveRun[] } | { success: false; error: { code: string; message: string } }>
    }
    api: {
      playSound: () => void
      showContextMenu: () => void
      showContextMenuEditable: () => void
      onLanguageChange: (callback: (lng: string) => void) => () => void
      onThemeChange: (callback: (theme: string) => void) => () => void
      onFileOpened: (callback: (filePath: string) => void) => () => void
      // Media permissions
      requestMicrophonePermission: () => Promise<MediaPermissionStatus>
      requestCameraPermission: () => Promise<MediaPermissionStatus>
      getMicrophonePermissionStatus: () => Promise<MediaPermissionStatus>
      getCameraPermissionStatus: () => Promise<MediaPermissionStatus>
      getMediaDevices: (type: 'audioinput' | 'videoinput') => Promise<MediaDeviceInfo[]>
      // Bluetooth
      bluetoothIsSupported: () => Promise<boolean>
      bluetoothGetPermissionStatus: () => Promise<string>
      bluetoothGetInfo: () => Promise<{ platform: string; supported: boolean; apiAvailable: boolean }>
      // Network
      networkIsSupported: () => Promise<boolean>
      networkGetConnectionStatus: () => Promise<NetworkConnectionStatus>
      networkGetInterfaces: () => Promise<NetworkInterfaceInfo[]>
      networkGetInfo: () => Promise<NetworkInfo>
      onNetworkStatusChange: (callback: (status: NetworkConnectionStatus) => void) => () => void
      // Cron
      cronGetAllJobs: () => Promise<CronJobStatus[]>
      cronGetJob: (id: string) => Promise<CronJobStatus | null>
      cronStartJob: (id: string) => Promise<boolean>
      cronStopJob: (id: string) => Promise<boolean>
      cronDeleteJob: (id: string) => Promise<boolean>
      cronCreateJob: (config: CronJobConfig) => Promise<boolean>
      cronUpdateSchedule: (id: string, schedule: string) => Promise<boolean>
      cronValidateExpression: (expression: string) => Promise<{ valid: boolean; description?: string; error?: string }>
      onCronJobResult: (callback: (result: CronJobResult) => void) => () => void
      // Lifecycle
      lifecycleGetState: () => Promise<LifecycleState>
      lifecycleGetEvents: () => Promise<LifecycleEvent[]>
      lifecycleRestart: () => Promise<void>
      onLifecycleEvent: (callback: (event: LifecycleEvent) => void) => () => void
      // Window Manager
      wmGetState: () => Promise<WindowManagerState>
      wmCreateChild: () => Promise<ManagedWindowInfo>
      wmCreateModal: () => Promise<ManagedWindowInfo>
      wmCreateFrameless: () => Promise<ManagedWindowInfo>
      wmCreateWidget: () => Promise<ManagedWindowInfo>
      wmCloseWindow: (id: number) => Promise<boolean>
      wmCloseAll: () => Promise<void>
      onWmStateChange: (callback: (state: WindowManagerState) => void) => () => void
      // Filesystem
      fsOpenFile: () => Promise<FileInfo | null>
      fsReadFile: (filePath: string) => Promise<FileInfo>
      fsSaveFile: (defaultName: string, content: string) => Promise<{ success: boolean; filePath: string | null }>
      fsWriteFile: (filePath: string, content: string) => Promise<{ success: boolean; filePath: string }>
      fsSelectDirectory: () => Promise<string | null>
      fsWatchDirectory: (dirPath: string) => Promise<boolean>
      fsUnwatchDirectory: (dirPath: string) => Promise<boolean>
      fsGetWatched: () => Promise<string[]>
      onFsWatchEvent: (callback: (event: FsWatchEvent) => void) => () => void
      // Dialogs
      dialogOpen: () => Promise<DialogResult>
      dialogOpenDirectory: (multiSelections?: boolean) => Promise<DialogResult>
      dialogSave: () => Promise<DialogResult>
      dialogMessage: (message: string, detail: string, buttons: string[]) => Promise<DialogResult>
      dialogError: (title: string, content: string) => Promise<DialogResult>
      // Notifications
      notificationIsSupported: () => Promise<boolean>
      notificationShow: (options: NotificationOptions) => Promise<string>
      onNotificationEvent: (callback: (result: NotificationResult) => void) => () => void
      // Clipboard
      clipboardWriteText: (text: string) => Promise<boolean>
      clipboardReadText: () => Promise<string>
      clipboardWriteHTML: (html: string) => Promise<boolean>
      clipboardReadHTML: () => Promise<string>
      clipboardWriteImage: (dataURL: string) => Promise<boolean>
      clipboardReadImage: () => Promise<ClipboardImageData | null>
      clipboardClear: () => Promise<boolean>
      clipboardGetContent: () => Promise<ClipboardContent | null>
      clipboardGetFormats: () => Promise<string[]>
      clipboardHasText: () => Promise<boolean>
      clipboardHasImage: () => Promise<boolean>
      clipboardHasHTML: () => Promise<boolean>
      // Store
      storeGetAllModelSettings: () => Promise<Record<string, { selectedModel: string; apiToken: string }>>
      storeGetModelSettings: (providerId: string) => Promise<{ selectedModel: string; apiToken: string } | null>
      storeSetSelectedModel: (providerId: string, modelId: string) => Promise<void>
      storeSetApiToken: (providerId: string, token: string) => Promise<void>
      storeSetModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }) => Promise<void>
      // Workspace
      workspaceSelectFolder: () => Promise<string | null>
      workspaceGetCurrent: () => Promise<string | null>
      workspaceSetCurrent: (workspacePath: string) => Promise<void>
      workspaceGetRecent: () => Promise<WorkspaceInfo[]>
      workspaceClear: () => Promise<void>
      workspaceDirectoryExists: (directoryPath: string) => Promise<boolean>
      workspaceRemoveRecent: (workspacePath: string) => Promise<void>
      // Posts - Sync posts to workspace filesystem
      postsSyncToWorkspace: (posts: Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
      }>) => Promise<{
        success: boolean
        syncedCount: number
        failedCount: number
        errors?: Array<{ postId: string; error: string }>
      }>
      postsUpdatePost: (post: {
        id: string
        title: string
        blocks: Array<{ id: string; content: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
      }) => Promise<void>
      postsDeletePost: (postId: string) => Promise<void>
      postsLoadFromWorkspace: () => Promise<Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
      }>>
      onPostsFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        postId: string
        filePath: string
        timestamp: number
      }) => void) => () => void
      onPostsWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
      // Documents
      documentsImportFiles: () => Promise<Array<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>>
      documentsImportByPaths: (paths: string[]) => Promise<Array<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>>
      documentsDownloadFromUrl: (url: string) => Promise<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>
      documentsLoadAll: () => Promise<Array<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>>
      documentsDeleteFile: (id: string) => Promise<void>
      onDocumentsFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        fileId: string
        filePath: string
        timestamp: number
      }) => void) => () => void
      onDocumentsWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
      // Pipeline
      pipelineRun: (agentName: string, input: { prompt: string; context?: Record<string, unknown> }) => Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }>
      pipelineCancel: (runId: string) => void
      pipelineListAgents: () => Promise<{ success: true; data: string[] } | { success: false; error: { code: string; message: string } }>
      pipelineListRuns: () => Promise<{ success: true; data: PipelineActiveRun[] } | { success: false; error: { code: string; message: string } }>
      onPipelineEvent: (callback: (event: PipelineEvent) => void) => () => void
      // Agent
      agentRun: (messages: Array<{role: 'user' | 'assistant'; content: string}>, runId: string, providerId: string) => Promise<void>
      agentCancel: (runId: string) => void
      onAgentEvent: (callback: (eventType: string, data: unknown) => void) => () => void
      // Agent - Session Management
      agentCreateSession: (config: {
        sessionId: string
        providerId: string
        modelId?: string
        systemPrompt?: string
        temperature?: number
        maxTokens?: number
        metadata?: Record<string, unknown>
      }) => Promise<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
      }>
      agentDestroySession: (sessionId: string) => Promise<boolean>
      agentGetSession: (sessionId: string) => Promise<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
      } | null>
      agentListSessions: () => Promise<Array<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
      }>>
      agentClearSessions: () => Promise<number>
      // Agent - Enhanced Execution
      agentRunSession: (options: {
        sessionId: string
        runId: string
        messages: Array<{ role: 'user' | 'assistant'; content: string }>
        providerId: string
        temperature?: number
        maxTokens?: number
        stream?: boolean
      }) => Promise<void>
      agentCancelSession: (sessionId: string) => Promise<boolean>
      // Agent - Status
      agentGetStatus: () => Promise<{
        totalSessions: number
        activeSessions: number
        totalMessages: number
      }>
      agentIsRunning: (runId: string) => Promise<boolean>
      // Window controls
      popupMenu: () => Promise<void>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
      windowIsMaximized: () => Promise<boolean>
      getPlatform: () => Promise<string>
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
      windowIsFullScreen: () => Promise<boolean>
      onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void
      // Context Menu
      showPostContextMenu: (postId: string, postTitle: string) => Promise<void>
      onPostContextMenuAction: (callback: (data: { action: string; postId: string }) => void) => () => void
      // Directories - Indexed directory management
      directoriesList: () => Promise<Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
      }>>
      directoriesAdd: (dirPath: string) => Promise<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
      }>
      directoriesAddMany: (dirPaths: string[]) => Promise<{
        added: Array<{
          id: string
          path: string
          addedAt: number
          isIndexed: boolean
          lastIndexedAt?: number
        }>
        errors: Array<{ path: string; error: string }>
      }>
      directoriesRemove: (id: string) => Promise<boolean>
      directoriesValidate: (dirPath: string) => Promise<{ valid: boolean; error?: string }>
      directoriesMarkIndexed: (id: string, isIndexed: boolean) => Promise<boolean>
      onDirectoriesChanged: (callback: (directories: Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
      }>) => void) => () => void
      // Personality - Conversation file management (markdown with YAML frontmatter)
      personalitySave: (input: {
        sectionId: string
        content: string
        metadata?: Record<string, unknown>
      }) => Promise<{
        id: string
        path: string
        savedAt: number
      }>
      personalityLoadAll: () => Promise<Array<{
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
      }>>
      personalityLoadOne: (params: {
        sectionId: string
        id: string
      }) => Promise<{
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
      } | null>
      personalityDelete: (params: {
        sectionId: string
        id: string
      }) => Promise<void>
      onPersonalityFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        sectionId: string
        fileId: string
        filePath: string
        timestamp: number
      }) => void) => () => void
      onPersonalityWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
    }
  }
}
