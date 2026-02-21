import { app, BrowserWindow, nativeTheme } from 'electron'
import path from 'node:path'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'

import type { LifecycleService } from './services/lifecycle'
import { bootstrapServices, bootstrapIpcModules, setupAppLifecycle, setupEventLogging, cleanup } from './bootstrap'

// Bootstrap new architecture - FULL INTEGRATION ENABLED
console.log('[Main] Bootstrapping core infrastructure...')
const { container, eventBus, appState, windowFactory, logger } = bootstrapServices()
console.log('[Main] Enabling IPC modules...')
bootstrapIpcModules(container, eventBus)
setupAppLifecycle(appState, logger)
setupEventLogging(logger)

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

const mainWindow = new Main(appState, windowFactory)

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
  },
  onNewWorkspace: () => {
    mainWindow.createWorkspaceWindow()
  }
})

// macOS: handle file open via Finder / double-click (before and after ready)
let pendingFilePath: string | null = null

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  logger.debug('App', `File open request: ${filePath}`)
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

  // Initialize lifecycle service
  // Note: Second instance file handler is configured in bootstrap
  lifecycleService.initialize()

  menuManager.create()
  trayManager.create()

  // Create main window
  mainWindow.create()

  // Update tray menu when window visibility changes
  mainWindow.setOnWindowVisibilityChange(() => {
    trayManager.updateContextMenu()
  })

  // Handle file from macOS open-file event that arrived before ready
  if (pendingFilePath) {
    logger.info('App', `Opening pending file from macOS: ${pendingFilePath}`)
    mainWindow.createWindowForFile(pendingFilePath)
    pendingFilePath = null
  }

  // Windows/Linux: handle file passed as command-line argument on first launch
  const fileFromArgs = extractFilePathFromArgs(process.argv.slice(1))
  if (fileFromArgs) {
    logger.info('App', `Opening file from command line: ${fileFromArgs}`)
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
