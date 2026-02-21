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
      // RAG
      ragIndex: (filePath: string, providerId: string) => Promise<{ filePath: string; chunkCount: number }>
      ragQuery: (filePath: string, question: string, runId: string, providerId: string) => Promise<void>
      ragCancel: (runId: string) => void
      ragGetStatus: () => Promise<{ files: Array<{ filePath: string; chunkCount: number; indexedAt: number }> }>
      onRagEvent: (callback: (eventType: string, data: unknown) => void) => () => void
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
    }
  }
}
