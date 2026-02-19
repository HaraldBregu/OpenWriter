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

interface UpdateSimInfo {
  version: string
  releaseDate: string
  releaseNotes: string
  downloadSize: number
}

interface UpdateSimProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

interface UpdateSimState {
  status: string
  updateInfo: UpdateSimInfo | null
  progress: UpdateSimProgress | null
  error: string | null
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

type UpdateStatus = 'idle' | 'checking' | 'not-available' | 'downloading' | 'downloaded' | 'error'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

interface UpdateState {
  status: UpdateStatus
  updateInfo: UpdateInfo | null
  error: string | null
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
      // Update
      updateGetState: () => Promise<UpdateState>
      updateGetVersion: () => Promise<string>
      updateCheck: () => Promise<void>
      updateInstall: () => Promise<void>
      onUpdateStateChange: (callback: (state: UpdateState) => void) => () => void
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
      // RAG
      ragIndex: (filePath: string, providerId: string) => Promise<{ filePath: string; chunkCount: number }>
      ragQuery: (filePath: string, question: string, runId: string, providerId: string) => Promise<void>
      ragCancel: (runId: string) => void
      ragGetStatus: () => Promise<{ files: Array<{ filePath: string; chunkCount: number; indexedAt: number }> }>
      onRagEvent: (callback: (eventType: string, data: unknown) => void) => () => void
      // Agent
      agentRun: (messages: Array<{role: 'user' | 'assistant'; content: string}>, runId: string, providerId: string) => Promise<void>
      agentCancel: (runId: string) => void
      onAgentEvent: (callback: (eventType: string, data: unknown) => void) => () => void
      // Update Simulator
      updateSimCheck: () => Promise<void>
      updateSimDownload: () => Promise<void>
      updateSimInstall: () => Promise<void>
      updateSimCancel: () => Promise<void>
      updateSimReset: () => Promise<void>
      updateSimGetState: () => Promise<UpdateSimState>
      onUpdateSimStateChange: (callback: (state: UpdateSimState) => void) => () => void
      onUpdateSimProgress: (callback: (progress: UpdateSimProgress) => void) => () => void
      // Window controls
      popupMenu: () => Promise<void>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
      windowIsMaximized: () => Promise<boolean>
      getPlatform: () => Promise<string>
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
    }
  }
}
