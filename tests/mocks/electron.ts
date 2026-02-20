/**
 * Mock for the 'electron' module.
 *
 * Provides jest.fn() stubs for every Electron API used in the Tesseract AI
 * main process.  Each mock is individually importable so tests can set up
 * return values and assertions on a per-test basis.
 *
 * Usage in tests:
 *   import { BrowserWindow, ipcMain, app } from 'electron'
 *   // All of these are already jest.fn() -- just add return values:
 *   (app.getPath as jest.Mock).mockReturnValue('/fake/path')
 */

// ---------------------------------------------------------------------------
// BrowserWindow
// ---------------------------------------------------------------------------

const mockWebContents = {
  send: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  openDevTools: jest.fn(),
  closeDevTools: jest.fn()
}

const mockBrowserWindowInstance = {
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  close: jest.fn(),
  destroy: jest.fn(),
  focus: jest.fn(),
  blur: jest.fn(),
  minimize: jest.fn(),
  maximize: jest.fn(),
  unmaximize: jest.fn(),
  isMaximized: jest.fn().mockReturnValue(false),
  isMinimized: jest.fn().mockReturnValue(false),
  isVisible: jest.fn().mockReturnValue(true),
  isDestroyed: jest.fn().mockReturnValue(false),
  isFocused: jest.fn().mockReturnValue(true),
  setTitle: jest.fn(),
  getTitle: jest.fn().mockReturnValue('Tesseract AI'),
  getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
  setBounds: jest.fn(),
  setMenu: jest.fn(),
  setMenuBarVisibility: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  webContents: mockWebContents,
  id: 1
}

const BrowserWindow = jest.fn(() => mockBrowserWindowInstance) as unknown as jest.Mock & {
  getAllWindows: jest.Mock
  fromId: jest.Mock
  getFocusedWindow: jest.Mock
}
BrowserWindow.getAllWindows = jest.fn().mockReturnValue([mockBrowserWindowInstance])
BrowserWindow.fromId = jest.fn().mockReturnValue(mockBrowserWindowInstance)
BrowserWindow.getFocusedWindow = jest.fn().mockReturnValue(mockBrowserWindowInstance)

// ---------------------------------------------------------------------------
// app
// ---------------------------------------------------------------------------

const app = {
  getPath: jest.fn((name: string) => {
    const paths: Record<string, string> = {
      userData: '/fake/userData',
      documents: '/fake/documents',
      downloads: '/fake/downloads',
      desktop: '/fake/desktop',
      home: '/fake/home',
      temp: '/fake/temp',
      appData: '/fake/appData'
    }
    return paths[name] ?? `/fake/${name}`
  }),
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  getName: jest.fn().mockReturnValue('Tesseract AI'),
  isReady: jest.fn().mockReturnValue(true),
  whenReady: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn(),
  exit: jest.fn(),
  relaunch: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  requestSingleInstanceLock: jest.fn().mockReturnValue(true),
  isPackaged: false,
  dock: {
    bounce: jest.fn(),
    setBadge: jest.fn(),
    getBadge: jest.fn().mockReturnValue('')
  }
}

// ---------------------------------------------------------------------------
// ipcMain
// ---------------------------------------------------------------------------

const ipcMain = {
  handle: jest.fn(),
  handleOnce: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeHandler: jest.fn(),
  removeAllListeners: jest.fn()
}

// ---------------------------------------------------------------------------
// ipcRenderer
// ---------------------------------------------------------------------------

const ipcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn()
}

// ---------------------------------------------------------------------------
// dialog
// ---------------------------------------------------------------------------

const dialog = {
  showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: ['/fake/file.txt'] }),
  showSaveDialog: jest.fn().mockResolvedValue({ canceled: false, filePath: '/fake/file.txt' }),
  showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
  showErrorBox: jest.fn()
}

// ---------------------------------------------------------------------------
// clipboard
// ---------------------------------------------------------------------------

const clipboard = {
  writeText: jest.fn(),
  readText: jest.fn().mockReturnValue(''),
  writeHTML: jest.fn(),
  readHTML: jest.fn().mockReturnValue(''),
  writeImage: jest.fn(),
  readImage: jest.fn().mockReturnValue({ isEmpty: () => true, getSize: () => ({ width: 0, height: 0 }), toDataURL: () => '' }),
  clear: jest.fn(),
  availableFormats: jest.fn().mockReturnValue([])
}

// ---------------------------------------------------------------------------
// nativeImage
// ---------------------------------------------------------------------------

const nativeImage = {
  createFromDataURL: jest.fn().mockReturnValue({
    isEmpty: () => false,
    getSize: () => ({ width: 100, height: 100 }),
    toDataURL: () => 'data:image/png;base64,fake'
  }),
  createFromPath: jest.fn()
}

// ---------------------------------------------------------------------------
// Menu & Tray
// ---------------------------------------------------------------------------

const Menu = {
  buildFromTemplate: jest.fn().mockReturnValue({}),
  setApplicationMenu: jest.fn(),
  getApplicationMenu: jest.fn().mockReturnValue(null)
}

const Tray = jest.fn(() => ({
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn()
}))

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

const Notification = jest.fn(() => ({
  show: jest.fn(),
  close: jest.fn(),
  on: jest.fn()
})) as unknown as jest.Mock & { isSupported: jest.Mock }
Notification.isSupported = jest.fn().mockReturnValue(true)

// ---------------------------------------------------------------------------
// contextBridge
// ---------------------------------------------------------------------------

const contextBridge = {
  exposeInMainWorld: jest.fn()
}

// ---------------------------------------------------------------------------
// shell & systemPreferences
// ---------------------------------------------------------------------------

const shell = {
  openExternal: jest.fn().mockResolvedValue(undefined),
  openPath: jest.fn().mockResolvedValue(''),
  showItemInFolder: jest.fn()
}

const systemPreferences = {
  getMediaAccessStatus: jest.fn().mockReturnValue('granted'),
  askForMediaAccess: jest.fn().mockResolvedValue(true)
}

// ---------------------------------------------------------------------------
// Export (matches the real 'electron' module's named exports)
// ---------------------------------------------------------------------------

export {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  dialog,
  clipboard,
  nativeImage,
  Menu,
  Tray,
  Notification,
  contextBridge,
  shell,
  systemPreferences,
  // Re-export for direct access to the mock instance
  mockBrowserWindowInstance,
  mockWebContents
}
