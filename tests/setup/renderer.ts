/**
 * Jest setup file for renderer process tests.
 *
 * Runs after the test framework is installed but before each test file.
 * Sets up:
 *   - @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
 *   - window.api mock (preload bridge)
 *   - window.electron mock
 *   - window.matchMedia stub (used by Tailwind/Radix)
 */
// TextEncoder/TextDecoder polyfill is handled by setupFiles (polyfills.ts)
import '@testing-library/jest-dom'
import { installMockApi, resetMockApi } from '../mocks/preload-bridge'

// Stub Element.scrollIntoView (not implemented in jsdom)
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = jest.fn()
}

// Install the window.api mock globally
installMockApi()

// Install namespaced window mocks to match the actual preload bridge structure
// (contextBridge exposes individual namespaces, not a flat window.api)

Object.defineProperty(window, 'app', {
  value: {
    playSound: jest.fn(),
    setTheme: jest.fn(),
    showContextMenu: jest.fn(),
    showContextMenuEditable: jest.fn(),
    onLanguageChange: jest.fn().mockReturnValue(jest.fn()),
    onThemeChange: jest.fn().mockReturnValue(jest.fn()),
    onFileOpened: jest.fn().mockReturnValue(jest.fn()),
    popupMenu: jest.fn(),
    getPlatform: jest.fn().mockResolvedValue('win32')
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'win', {
  value: {
    minimize: jest.fn(),
    maximize: jest.fn(),
    close: jest.fn(),
    isMaximized: jest.fn().mockResolvedValue(false),
    isFullScreen: jest.fn().mockResolvedValue(false),
    onMaximizeChange: jest.fn().mockReturnValue(jest.fn()),
    onFullScreenChange: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'media', {
  value: {
    requestMicrophonePermission: jest.fn().mockResolvedValue('granted'),
    requestCameraPermission: jest.fn().mockResolvedValue('granted'),
    getMicrophonePermissionStatus: jest.fn().mockResolvedValue('not-determined'),
    getCameraPermissionStatus: jest.fn().mockResolvedValue('not-determined'),
    getDevices: jest.fn().mockResolvedValue([])
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'bluetooth', {
  value: {
    isSupported: jest.fn().mockResolvedValue(true),
    getPermissionStatus: jest.fn().mockResolvedValue('granted'),
    getInfo: jest.fn().mockResolvedValue({ platform: 'win32', supported: true, apiAvailable: true })
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'network', {
  value: {
    isSupported: jest.fn().mockResolvedValue(true),
    getConnectionStatus: jest.fn().mockResolvedValue('online'),
    getInterfaces: jest.fn().mockResolvedValue([]),
    getInfo: jest.fn().mockResolvedValue({ platform: 'win32', supported: true, isOnline: true, interfaceCount: 0 }),
    onStatusChange: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'cron', {
  value: {
    getAll: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue(null),
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue(true),
    updateSchedule: jest.fn().mockResolvedValue(true),
    validateExpression: jest.fn().mockResolvedValue({ valid: true }),
    onJobResult: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'lifecycle', {
  value: {
    getState: jest.fn().mockResolvedValue({ events: [], appReadyAt: Date.now(), platform: 'win32', isSingleInstance: true }),
    getEvents: jest.fn().mockResolvedValue([]),
    restart: jest.fn().mockResolvedValue(undefined),
    onEvent: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'wm', {
  value: {
    getState: jest.fn().mockResolvedValue({ windows: [] }),
    createChild: jest.fn().mockResolvedValue({ id: 2, type: 'child', title: 'Child', createdAt: Date.now() }),
    createModal: jest.fn().mockResolvedValue({ id: 3, type: 'modal', title: 'Modal', createdAt: Date.now() }),
    createFrameless: jest.fn().mockResolvedValue({ id: 4, type: 'frameless', title: 'Frameless', createdAt: Date.now() }),
    createWidget: jest.fn().mockResolvedValue({ id: 5, type: 'widget', title: 'Widget', createdAt: Date.now() }),
    closeWindow: jest.fn().mockResolvedValue(true),
    closeAll: jest.fn().mockResolvedValue(undefined),
    onStateChange: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'fs', {
  value: {
    openFile: jest.fn().mockResolvedValue(null),
    readFile: jest.fn().mockResolvedValue({ filePath: '/test/file.txt', fileName: 'file.txt', content: '', size: 0, lastModified: Date.now() }),
    saveFile: jest.fn().mockResolvedValue({ success: true, filePath: '/test/file.txt' }),
    writeFile: jest.fn().mockResolvedValue({ success: true, filePath: '/test/file.txt' }),
    selectDirectory: jest.fn().mockResolvedValue(null),
    watchDirectory: jest.fn().mockResolvedValue(true),
    unwatchDirectory: jest.fn().mockResolvedValue(true),
    getWatched: jest.fn().mockResolvedValue([]),
    onWatchEvent: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'dialog', {
  value: {
    open: jest.fn().mockResolvedValue({ type: 'open', timestamp: Date.now(), data: {} }),
    openDirectory: jest.fn().mockResolvedValue({ type: 'open', timestamp: Date.now(), data: {} }),
    save: jest.fn().mockResolvedValue({ type: 'save', timestamp: Date.now(), data: {} }),
    message: jest.fn().mockResolvedValue({ type: 'message', timestamp: Date.now(), data: {} }),
    error: jest.fn().mockResolvedValue({ type: 'error', timestamp: Date.now(), data: {} })
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'notification', {
  value: {
    isSupported: jest.fn().mockResolvedValue(true),
    show: jest.fn().mockResolvedValue('notif-1'),
    onEvent: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(true),
    readText: jest.fn().mockResolvedValue(''),
    writeHTML: jest.fn().mockResolvedValue(true),
    readHTML: jest.fn().mockResolvedValue(''),
    writeImage: jest.fn().mockResolvedValue(true),
    readImage: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(true),
    getContent: jest.fn().mockResolvedValue(null),
    getFormats: jest.fn().mockResolvedValue([]),
    hasText: jest.fn().mockResolvedValue(false),
    hasImage: jest.fn().mockResolvedValue(false),
    hasHTML: jest.fn().mockResolvedValue(false)
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'store', {
  value: {
    getAllModelSettings: jest.fn().mockResolvedValue({}),
    getModelSettings: jest.fn().mockResolvedValue(null),
    setSelectedModel: jest.fn().mockResolvedValue(undefined),
    setApiToken: jest.fn().mockResolvedValue(undefined),
    setModelSettings: jest.fn().mockResolvedValue(undefined)
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'workspace', {
  value: {
    selectFolder: jest.fn().mockResolvedValue(null),
    getCurrent: jest.fn().mockResolvedValue(null),
    setCurrent: jest.fn().mockResolvedValue(undefined),
    getRecent: jest.fn().mockResolvedValue([]),
    clear: jest.fn().mockResolvedValue(undefined),
    directoryExists: jest.fn().mockResolvedValue(true),
    removeRecent: jest.fn().mockResolvedValue(undefined)
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'posts', {
  value: {
    syncToWorkspace: jest.fn().mockResolvedValue({ success: true, syncedCount: 0, failedCount: 0 }),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    loadFromWorkspace: jest.fn().mockResolvedValue([]),
    onFileChange: jest.fn().mockReturnValue(jest.fn()),
    onWatcherError: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'documents', {
  value: {
    importFiles: jest.fn().mockResolvedValue([]),
    importByPaths: jest.fn().mockResolvedValue([]),
    downloadFromUrl: jest.fn().mockResolvedValue({}),
    loadAll: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    onFileChange: jest.fn().mockReturnValue(jest.fn()),
    onWatcherError: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'agent', {
  value: {
    run: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn(),
    onEvent: jest.fn().mockReturnValue(jest.fn()),
    createSession: jest.fn().mockResolvedValue({ sessionId: 'test', providerId: 'openai', modelId: 'gpt-4', createdAt: Date.now(), lastActivity: Date.now(), isActive: true, messageCount: 0 }),
    destroySession: jest.fn().mockResolvedValue(true),
    getSession: jest.fn().mockResolvedValue(null),
    listSessions: jest.fn().mockResolvedValue([]),
    clearSessions: jest.fn().mockResolvedValue(0),
    runSession: jest.fn().mockResolvedValue(undefined),
    cancelSession: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({ totalSessions: 0, activeSessions: 0, totalMessages: 0 }),
    isRunning: jest.fn().mockResolvedValue(false)
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'contextMenu', {
  value: {
    showWriting: jest.fn().mockResolvedValue(undefined),
    onWritingAction: jest.fn().mockReturnValue(jest.fn()),
    showPost: jest.fn().mockResolvedValue(undefined),
    onPostAction: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'directories', {
  value: {
    list: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue({ id: '1', path: '/test', addedAt: Date.now(), isIndexed: false }),
    addMany: jest.fn().mockResolvedValue({ added: [], errors: [] }),
    remove: jest.fn().mockResolvedValue(true),
    validate: jest.fn().mockResolvedValue({ valid: true }),
    markIndexed: jest.fn().mockResolvedValue(true),
    onChanged: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'personality', {
  value: {
    save: jest.fn().mockResolvedValue({ id: '1', path: '/test', savedAt: Date.now() }),
    loadAll: jest.fn().mockResolvedValue([]),
    loadOne: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    onFileChange: jest.fn().mockReturnValue(jest.fn()),
    onWatcherError: jest.fn().mockReturnValue(jest.fn()),
    loadSectionConfig: jest.fn().mockResolvedValue(null),
    saveSectionConfig: jest.fn().mockResolvedValue({}),
    onSectionConfigChange: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'output', {
  value: {
    save: jest.fn().mockResolvedValue({ id: '1', path: '/test', savedAt: Date.now() }),
    loadAll: jest.fn().mockResolvedValue([]),
    loadByType: jest.fn().mockResolvedValue([]),
    loadOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    onFileChange: jest.fn().mockReturnValue(jest.fn()),
    onWatcherError: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'task', {
  value: {
    submit: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'task-1' } }),
    cancel: jest.fn().mockResolvedValue({ success: true, data: true }),
    list: jest.fn().mockResolvedValue({ success: true, data: [] }),
    onEvent: jest.fn().mockReturnValue(jest.fn())
  },
  writable: true, configurable: true
})

Object.defineProperty(window, 'ai', {
  value: {
    inference: jest.fn().mockResolvedValue({ success: true, data: { runId: 'run-1' } }),
    cancel: jest.fn(),
    onEvent: jest.fn().mockReturnValue(jest.fn()),
    listAgents: jest.fn().mockResolvedValue({ success: true, data: [] }),
    listRuns: jest.fn().mockResolvedValue({ success: true, data: [] })
  },
  writable: true, configurable: true
})

// Provide a minimal window.electron mock
Object.defineProperty(window, 'electron', {
  value: {
    process: { platform: 'win32', versions: { electron: '40.0.0', node: '22.0.0' } },
    ipcRenderer: {
      invoke: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn()
    }
  },
  writable: true,
  configurable: true
})

// Stub matchMedia (used by Radix UI, Tailwind responsive utilities, etc.)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Stub ResizeObserver (used by many UI libraries)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Stub IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}))

// Reset mocks between tests to avoid state leaking
beforeEach(() => {
  resetMockApi()
})

afterEach(() => {
  jest.restoreAllMocks()
})
