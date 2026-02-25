import { BrowserWindow, nativeTheme } from 'electron'
import type { AppState } from './core/AppState'
import type { WindowFactory } from './core/WindowFactory'
import type { WindowContextManager } from './core/WindowContext'

function getBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#1A1A1A' : '#F7F7F7'
}

export class Main {
  private window: BrowserWindow | null = null
  private onWindowVisibilityChange?: () => void

  constructor(
    private appState: AppState,
    private windowFactory: WindowFactory,
    private windowContextManager: WindowContextManager
  ) {
    // Constructor is now minimal
    // All services are managed by ServiceContainer in bootstrap
    // All IPC handlers are registered in IPC modules via bootstrap
    console.log('[Main] Main class initialized')
  }

  /**
   * Attach common window event handlers shared by all window types.
   * This eliminates duplicate code between create() and createWorkspaceWindow().
   *
   * Handlers include:
   *   - update-target-url: Suppresses native Chromium URL bubble on link hover
   *   - maximize/unmaximize: Notifies renderer of window state changes
   *   - enter/leave fullscreen: Notifies renderer of fullscreen state changes
   */
  private attachCommonWindowHandlers(win: BrowserWindow): void {
    // Suppress native Chromium URL bubble on link hover
    win.webContents.on('update-target-url', () => {})

    // Notify renderer when window is maximized/unmaximized
    win.on('maximize', () => {
      win.webContents.send('window:maximize-change', true)
    })

    win.on('unmaximize', () => {
      win.webContents.send('window:maximize-change', false)
    })

    // Notify renderer when entering/leaving fullscreen
    win.on('enter-full-screen', () => {
      win.webContents.send('window:fullscreen-change', true)
    })

    win.on('leave-full-screen', () => {
      win.webContents.send('window:fullscreen-change', false)
    })
  }

  create(): BrowserWindow {
    const isMac = process.platform === 'darwin'
    this.window = this.windowFactory.create({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      // titleBarStyle:'hidden' on Windows retains native min/max/close buttons.
      // Only use it on macOS where it hides the title bar while keeping traffic lights.
      ...(isMac && {
        titleBarStyle: 'hidden' as const,
        trafficLightPosition: { x: 16, y: 16 }
      }),
      backgroundColor: getBackgroundColor()
    })

    // Create window context for isolated services
    this.windowContextManager.create(this.window)
    console.log(`[Main] Created window context for window ${this.window.id}`)

    // Attach common window handlers (shared with workspace windows)
    this.attachCommonWindowHandlers(this.window)

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    // Minimize to tray instead of closing
    this.window.on('close', (event) => {
      if (!this.appState.isQuitting) {
        event.preventDefault()
        this.window?.hide()
        this.onWindowVisibilityChange?.()
      }
    })

    // Update tray menu when window is shown/hidden
    this.window.on('show', () => {
      this.onWindowVisibilityChange?.()
    })

    this.window.on('hide', () => {
      this.onWindowVisibilityChange?.()
    })

    this.window.on('closed', () => {
      this.window = null
    })

    return this.window
  }

  showOrCreate(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].show()
      windows[0].focus()
    } else {
      this.create()
    }
  }

  hide(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].hide()
    }
  }

  toggleVisibility(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      this.create()
    }
  }

  isVisible(): boolean {
    const windows = BrowserWindow.getAllWindows()
    return windows.length > 0 && windows[0].isVisible()
  }

  setOnWindowVisibilityChange(callback: () => void): void {
    this.onWindowVisibilityChange = callback
  }

  createWindowForFile(filePath: string): BrowserWindow {
    const isMac = process.platform === 'darwin'
    const win = this.windowFactory.create({
      width: 1600,
      height: 1000,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      ...(isMac && {
        titleBarStyle: 'hidden' as const,
        trafficLightPosition: { x: 9, y: 9 }
      }),
      backgroundColor: getBackgroundColor()
    })

    // Create window context for isolated services
    this.windowContextManager.create(win)
    console.log(`[Main] Created window context for file window ${win.id}`)

    win.once('ready-to-show', () => {
      win.show()
      win.webContents.send('file-opened', filePath)
    })

    return win
  }

  createWorkspaceWindow(): BrowserWindow {
    // Get the main window dimensions to calculate 10% smaller size
    const mainWindow = this.window
    let width = 1080 // 1200 * 0.9
    let height = 720 // 800 * 0.9

    if (mainWindow) {
      const [mainWidth, mainHeight] = mainWindow.getSize()
      width = Math.floor(mainWidth * 0.9)
      height = Math.floor(mainHeight * 0.9)
    }

    const isMac = process.platform === 'darwin'
    const workspaceWindow = this.windowFactory.create({
      width,
      height,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      ...(isMac && {
        titleBarStyle: 'hidden' as const,
        trafficLightPosition: { x: 16, y: 16 }
      }),
      backgroundColor: getBackgroundColor()
    })

    // Create window context for isolated services
    // CRITICAL: This ensures each workspace window has its own WorkspaceService
    // and WorkspaceMetadataService instances, preventing data leakage
    this.windowContextManager.create(workspaceWindow)
    console.log(`[Main] Created window context for workspace window ${workspaceWindow.id}`)

    // Attach common window handlers (shared with main window)
    this.attachCommonWindowHandlers(workspaceWindow)

    workspaceWindow.once('ready-to-show', () => {
      workspaceWindow.show()
    })

    return workspaceWindow
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }
}
