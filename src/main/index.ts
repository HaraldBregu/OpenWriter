import { app, BrowserWindow, nativeTheme } from 'electron'
import path from 'node:path'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'
import { LifecycleService } from './services/lifecycle'
import { WorkspaceSelector } from './workspace'
import { StoreService } from './services/store'
import { bootstrapServices, setupAppLifecycle, cleanup } from './bootstrap'

// Bootstrap new architecture (services only - IPC modules disabled until Main class is refactored)
console.log('[Main] Bootstrapping core infrastructure...')
const { container, appState } = bootstrapServices()
// TODO: Enable IPC modules after removing handlers from Main class constructor
// import { bootstrapIpcModules } from './bootstrap'
// bootstrapIpcModules(container, eventBus)
setupAppLifecycle(appState)

// Add isQuitting property to app (legacy - will be replaced with appState)
;(app as { isQuitting?: boolean }).isQuitting = false

const TSRCT_EXT = '.tsrct'

function isTsrctFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === TSRCT_EXT
}

function extractFilePathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (isTsrctFile(arg)) {
      return arg
    }
  }
  return null
}

// Must be created before app.whenReady() for single-instance lock
const lifecycleService = new LifecycleService({
  onSecondInstanceFile: (filePath) => {
    mainWindow.createWindowForFile(filePath)
  }
})

const mainWindow = new Main(lifecycleService)

const trayManager = new Tray({
  onShowApp: () => mainWindow.showOrCreate(),
  onHideApp: () => mainWindow.hide(),
  onToggleApp: () => mainWindow.toggleVisibility(),
  onQuit: () => {
    ;(app as { isQuitting?: boolean }).isQuitting = true
    app.quit()
  },
  isAppVisible: () => mainWindow.isVisible()
})

const menuManager = new Menu({
  onLanguageChange: (lng) => {
    trayManager.updateLanguage(lng)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('change-language', lng)
    })
  },
  onThemeChange: (theme) => {
    nativeTheme.themeSource = theme as 'light' | 'dark' | 'system'
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('change-theme', theme)
    })
  }
})

// macOS: handle file open via Finder / double-click (before and after ready)
let pendingFilePath: string | null = null

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (!isTsrctFile(filePath)) return

  if (app.isReady()) {
    mainWindow.createWindowForFile(filePath)
  } else {
    pendingFilePath = filePath
  }
})

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  lifecycleService.initialize()
  menuManager.create()
  trayManager.create()

  // Check for existing workspace
  const storeService = new StoreService()
  let currentWorkspace = storeService.getCurrentWorkspace()

  // If no workspace is set, show workspace selector
  if (!currentWorkspace) {
    const workspaceSelector = new WorkspaceSelector()
    currentWorkspace = await workspaceSelector.show()

    // If user cancelled workspace selection, quit the app
    if (!currentWorkspace) {
      app.quit()
      return
    }

    // Save the selected workspace
    storeService.setCurrentWorkspace(currentWorkspace)
  }

  // Create main window with workspace
  mainWindow.create()

  // Update tray menu when window visibility changes
  mainWindow.setOnWindowVisibilityChange(() => {
    trayManager.updateContextMenu()
  })

  // Handle file from macOS open-file event that arrived before ready
  if (pendingFilePath) {
    mainWindow.createWindowForFile(pendingFilePath)
    pendingFilePath = null
  }

  // Windows/Linux: handle file passed as command-line argument on first launch
  const fileFromArgs = extractFilePathFromArgs(process.argv.slice(1))
  if (fileFromArgs) {
    mainWindow.createWindowForFile(fileFromArgs)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow.create()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed
  // The app will continue running in the system tray
  // Only quit if explicitly requested via tray menu or app.quit()
  if (process.platform !== 'darwin' && (app as { isQuitting?: boolean }).isQuitting) {
    app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as { isQuitting?: boolean }).isQuitting = true
})

app.on('quit', () => {
  cleanup(container)
})
