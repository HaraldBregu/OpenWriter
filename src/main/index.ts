import { app, BrowserWindow, nativeTheme } from 'electron'
import path from 'node:path'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'
import { WorkspaceSelector } from './workspace'
import type { StoreService } from './services/store'
import type { LifecycleService } from './services/lifecycle'
import { bootstrapServices, bootstrapIpcModules, setupAppLifecycle, cleanup } from './bootstrap'

// Bootstrap new architecture - FULL INTEGRATION ENABLED
console.log('[Main] Bootstrapping core infrastructure...')
const { container, eventBus, appState } = bootstrapServices()
console.log('[Main] Enabling IPC modules...')
bootstrapIpcModules(container, eventBus)
setupAppLifecycle(appState)

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

const mainWindow = new Main(appState)

const trayManager = new Tray({
  onShowApp: () => mainWindow.showOrCreate(),
  onHideApp: () => mainWindow.hide(),
  onToggleApp: () => mainWindow.toggleVisibility(),
  onQuit: () => {
    appState.setQuitting()
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

  // Get services from container
  const lifecycleService = container.get<LifecycleService>('lifecycle')
  const storeService = container.get<StoreService>('store')

  // Initialize lifecycle service
  // Note: Second instance file handler is configured in bootstrap
  lifecycleService.initialize()

  menuManager.create()
  trayManager.create()

  // Check for existing workspace
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

// Note: window-all-closed and before-quit handlers are now managed by setupAppLifecycle

app.on('quit', () => {
  cleanup(container)
})
