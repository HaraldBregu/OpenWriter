import { app, BrowserWindow, nativeTheme, dialog } from 'electron'
import path from 'node:path'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'
import { WorkspaceProcessManager } from './workspace-process'

import type { LifecycleService } from './services/lifecycle'
import type { WorkspaceService } from './services/workspace'
import type { WorkspaceMetadataService } from './services/workspace-metadata'
import { bootstrapServices, bootstrapIpcModules, setupAppLifecycle, setupEventLogging, cleanup } from './bootstrap'

// Check if running in workspace mode
const isWorkspaceMode = WorkspaceProcessManager.isWorkspaceMode()
const workspacePath = WorkspaceProcessManager.getWorkspacePathFromArgs()

console.log(`[Main] Starting in ${isWorkspaceMode ? 'WORKSPACE' : 'LAUNCHER'} mode`)
if (isWorkspaceMode && workspacePath) {
  console.log(`[Main] Workspace path: ${workspacePath}`)
}

// Bootstrap new architecture - FULL INTEGRATION ENABLED
console.log('[Main] Bootstrapping core infrastructure...')
const { container, eventBus, appState, windowFactory, logger, windowContextManager } = bootstrapServices()
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

const mainWindow = new Main(appState, windowFactory, windowContextManager)

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
  onNewWorkspace: async () => {
    // Show folder selection dialog
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Workspace Folder',
      buttonLabel: 'Select Workspace'
    })

    // If user selected a folder, spawn a new Electron instance
    if (!result.canceled && result.filePaths.length > 0) {
      const workspacePath = result.filePaths[0]

      logger.info('Menu', `Spawning separate process for workspace: ${workspacePath}`)

      // Create WorkspaceProcessManager instance
      const workspaceProcessManager = new WorkspaceProcessManager(logger)

      // Spawn a new Electron instance for this workspace
      const pid = workspaceProcessManager.spawnWorkspaceProcess({
        workspacePath,
        logger
      })

      logger.info('Menu', `Workspace process spawned with PID: ${pid}`)
    }
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
  // Get services from container
  const lifecycleService = container.get<LifecycleService>('lifecycle')

  // Initialize lifecycle service
  // Note: Second instance file handler is configured in bootstrap
  lifecycleService.initialize()

  // WORKSPACE MODE: Open workspace directly without launcher UI
  if (isWorkspaceMode && workspacePath) {
    logger.info('App', `Opening workspace in isolated process: ${workspacePath}`)

    // On Windows/Linux, remove the native menu bar for frameless windows.
    // Without this, Electron keeps a default application menu that can
    // intercept Alt-key presses and conflict with the custom titlebar.
    if (process.platform !== 'darwin') {
      const { Menu: ElectronMenu } = require('electron')
      ElectronMenu.setApplicationMenu(null)
    }

    // Create workspace window directly - no tray
    const workspaceWindow = mainWindow.createWorkspaceWindow()

    // Set the workspace path immediately
    const context = windowContextManager.get(workspaceWindow.id)
    const workspaceService = context.getService<WorkspaceService>('workspace', container)
    workspaceService.setCurrent(workspacePath)

    // CRITICAL: Reinitialize WorkspaceMetadataService after workspace path is set
    // This ensures the service reads from the correct workspace.tsrct file
    // and doesn't have stale cache from initialization
    const metadataService = context.getService<WorkspaceMetadataService>('workspaceMetadata', container)

    // Force cache clear and re-read from file
    logger.info('App', `Reinitializing WorkspaceMetadataService for workspace: ${workspacePath}`)
    metadataService.initialize()

    logger.info('App', `Workspace process ready with PID: ${process.pid}`)

    // Handle window close: quit app when workspace window closes
    workspaceWindow.on('closed', () => {
      logger.info('App', 'Workspace window closed, quitting process')
      app.quit()
    })

    return
  }

  // LAUNCHER MODE: Normal startup with menu, tray, and workspace selector
  menuManager.create()
  trayManager.create()

  // Sync menu radio buttons when theme changes from renderer
  eventBus.on('theme:changed', (event) => {
    const { theme } = event.payload as { theme: string }
    menuManager.updateTheme(theme)
  })

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
