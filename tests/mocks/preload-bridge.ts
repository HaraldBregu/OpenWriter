/**
 * Mock for the window.api preload bridge.
 *
 * Every method from src/preload/index.ts is stubbed as jest.fn() so
 * renderer tests can call window.api.* without hitting real IPC.
 *
 * Usage:
 *   import { mockApi, resetMockApi } from '../../mocks/preload-bridge'
 *   beforeEach(() => resetMockApi())
 *
 * To set up return values:
 *   mockApi.clipboardReadText.mockResolvedValue('hello')
 */

export const mockApi = {
  // Sound & Context Menu
  playSound: jest.fn(),
  showContextMenu: jest.fn(),
  showContextMenuEditable: jest.fn(),

  // Event listeners (return unsubscribe fn)
  onLanguageChange: jest.fn().mockReturnValue(jest.fn()),
  onThemeChange: jest.fn().mockReturnValue(jest.fn()),
  onFileOpened: jest.fn().mockReturnValue(jest.fn()),

  // Media permissions
  requestMicrophonePermission: jest.fn().mockResolvedValue('granted'),
  requestCameraPermission: jest.fn().mockResolvedValue('granted'),
  getMicrophonePermissionStatus: jest.fn().mockResolvedValue('granted'),
  getCameraPermissionStatus: jest.fn().mockResolvedValue('granted'),
  getMediaDevices: jest.fn().mockResolvedValue([]),

  // Bluetooth
  bluetoothIsSupported: jest.fn().mockResolvedValue(true),
  bluetoothGetPermissionStatus: jest.fn().mockResolvedValue('granted'),
  bluetoothGetInfo: jest.fn().mockResolvedValue({
    platform: 'win32',
    supported: true,
    apiAvailable: true
  }),

  // Network
  networkIsSupported: jest.fn().mockResolvedValue(true),
  networkGetConnectionStatus: jest.fn().mockResolvedValue('online'),
  networkGetInterfaces: jest.fn().mockResolvedValue([]),
  networkGetInfo: jest.fn().mockResolvedValue({
    platform: 'win32',
    supported: true,
    isOnline: true,
    interfaceCount: 2
  }),
  onNetworkStatusChange: jest.fn().mockReturnValue(jest.fn()),

  // Lifecycle
  lifecycleGetState: jest.fn().mockResolvedValue({
    events: [],
    appReadyAt: Date.now(),
    platform: 'win32'
  }),
  lifecycleGetEvents: jest.fn().mockResolvedValue([]),
  lifecycleRestart: jest.fn().mockResolvedValue(undefined),
  onLifecycleEvent: jest.fn().mockReturnValue(jest.fn()),

  // Window Manager
  wmGetState: jest.fn().mockResolvedValue({ windows: [] }),
  wmCreateChild: jest.fn().mockResolvedValue({ id: 2, type: 'child', title: 'Child', createdAt: Date.now() }),
  wmCreateModal: jest.fn().mockResolvedValue({ id: 3, type: 'modal', title: 'Modal', createdAt: Date.now() }),
  wmCreateFrameless: jest.fn().mockResolvedValue({ id: 4, type: 'frameless', title: 'Frameless', createdAt: Date.now() }),
  wmCreateWidget: jest.fn().mockResolvedValue({ id: 5, type: 'widget', title: 'Widget', createdAt: Date.now() }),
  wmCloseWindow: jest.fn().mockResolvedValue(true),
  wmCloseAll: jest.fn().mockResolvedValue(undefined),
  onWmStateChange: jest.fn().mockReturnValue(jest.fn()),

  // Filesystem
  fsOpenFile: jest.fn().mockResolvedValue(null),
  fsReadFile: jest.fn().mockResolvedValue({
    filePath: '/test/file.txt',
    fileName: 'file.txt',
    content: 'test content',
    size: 12,
    lastModified: Date.now()
  }),
  fsSaveFile: jest.fn().mockResolvedValue({ success: true, filePath: '/test/file.txt' }),
  fsWriteFile: jest.fn().mockResolvedValue({ success: true, filePath: '/test/file.txt' }),
  fsSelectDirectory: jest.fn().mockResolvedValue(null),
  fsWatchDirectory: jest.fn().mockResolvedValue(true),
  fsUnwatchDirectory: jest.fn().mockResolvedValue(true),
  fsGetWatched: jest.fn().mockResolvedValue([]),
  onFsWatchEvent: jest.fn().mockReturnValue(jest.fn()),

  // Dialogs
  dialogOpen: jest.fn().mockResolvedValue({ type: 'open', timestamp: Date.now(), data: {} }),
  dialogSave: jest.fn().mockResolvedValue({ type: 'save', timestamp: Date.now(), data: {} }),
  dialogMessage: jest.fn().mockResolvedValue({ type: 'message', timestamp: Date.now(), data: {} }),
  dialogError: jest.fn().mockResolvedValue({ type: 'error', timestamp: Date.now(), data: {} }),

  // Notifications
  notificationIsSupported: jest.fn().mockResolvedValue(true),
  notificationShow: jest.fn().mockResolvedValue('notif-1'),
  onNotificationEvent: jest.fn().mockReturnValue(jest.fn()),

  // Clipboard
  clipboardWriteText: jest.fn().mockResolvedValue(true),
  clipboardReadText: jest.fn().mockResolvedValue(''),
  clipboardWriteHTML: jest.fn().mockResolvedValue(true),
  clipboardReadHTML: jest.fn().mockResolvedValue(''),
  clipboardWriteImage: jest.fn().mockResolvedValue(true),
  clipboardReadImage: jest.fn().mockResolvedValue(null),
  clipboardClear: jest.fn().mockResolvedValue(true),
  clipboardGetContent: jest.fn().mockResolvedValue(null),
  clipboardGetFormats: jest.fn().mockResolvedValue([]),
  clipboardHasText: jest.fn().mockResolvedValue(false),
  clipboardHasImage: jest.fn().mockResolvedValue(false),
  clipboardHasHTML: jest.fn().mockResolvedValue(false),

  // Store
  storeGetAllModelSettings: jest.fn().mockResolvedValue({}),
  storeGetModelSettings: jest.fn().mockResolvedValue(null),
  storeSetSelectedModel: jest.fn().mockResolvedValue(undefined),
  storeSetApiToken: jest.fn().mockResolvedValue(undefined),
  storeSetModelSettings: jest.fn().mockResolvedValue(undefined),

  // Workspace
  workspaceSelectFolder: jest.fn().mockResolvedValue(null),
  workspaceGetCurrent: jest.fn().mockResolvedValue(null),
  workspaceSetCurrent: jest.fn().mockResolvedValue(undefined),
  workspaceGetRecent: jest.fn().mockResolvedValue([]),
  workspaceClear: jest.fn().mockResolvedValue(undefined),
  workspaceDirectoryExists: jest.fn().mockResolvedValue(true),

  // Agent
  agentRun: jest.fn().mockResolvedValue(undefined),
  agentCancel: jest.fn(),
  agentCreateSession: jest.fn().mockResolvedValue({
    sessionId: 'test-session',
    providerId: 'openai',
    modelId: 'gpt-4',
    createdAt: Date.now(),
    lastActivity: Date.now(),
    isActive: true,
    messageCount: 0
  }),
  agentDestroySession: jest.fn().mockResolvedValue(true),
  agentGetSession: jest.fn().mockResolvedValue(null),
  agentListSessions: jest.fn().mockResolvedValue([]),
  agentClearSessions: jest.fn().mockResolvedValue(0),
  agentRunSession: jest.fn().mockResolvedValue(undefined),
  agentCancelSession: jest.fn().mockResolvedValue(true),
  agentGetStatus: jest.fn().mockResolvedValue({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0
  }),
  agentIsRunning: jest.fn().mockResolvedValue(false),

  // RAG
  ragIndex: jest.fn().mockResolvedValue({ filePath: '/test/doc.txt', chunkCount: 5 }),
  ragQuery: jest.fn().mockResolvedValue(undefined),
  ragCancel: jest.fn(),
  ragGetStatus: jest.fn().mockResolvedValue({ files: [] }),
  onRagEvent: jest.fn().mockReturnValue(jest.fn()),
  onAgentEvent: jest.fn().mockReturnValue(jest.fn()),

  // Pipeline
  pipelineRun: jest.fn().mockResolvedValue({ success: true, data: { runId: 'test-run-id' } }),
  pipelineCancel: jest.fn().mockResolvedValue({ success: true }),
  pipelineListAgents: jest.fn().mockResolvedValue({ success: true, data: ['echo', 'counter'] }),
  pipelineListRuns: jest.fn().mockResolvedValue({ success: true, data: [] }),
  onPipelineEvent: jest.fn().mockReturnValue(jest.fn()),

  // Window controls
  popupMenu: jest.fn(),
  windowMinimize: jest.fn(),
  windowMaximize: jest.fn(),
  windowClose: jest.fn(),
  windowIsMaximized: jest.fn().mockResolvedValue(false),
  windowIsFullScreen: jest.fn().mockResolvedValue(false),
  getPlatform: jest.fn().mockResolvedValue('win32'),
  onMaximizeChange: jest.fn().mockReturnValue(jest.fn()),
  onFullScreenChange: jest.fn().mockReturnValue(jest.fn())
}

/**
 * Reset all mock functions to their default implementations.
 * Call this in beforeEach() to ensure a clean slate.
 */
export function resetMockApi(): void {
  for (const fn of Object.values(mockApi)) {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      ;(fn as jest.Mock).mockClear()
    }
  }
}

/**
 * Install the mock API on the global window object.
 * Should be called in setup files or beforeAll blocks.
 */
export function installMockApi(): void {
  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
    configurable: true
  })
}
