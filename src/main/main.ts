import { BrowserWindow } from 'electron'
import type { AppState } from './core/AppState'
import type { WindowFactory } from './core/WindowFactory'

export class Main {
  private window: BrowserWindow | null = null
  private onWindowVisibilityChange?: () => void

  constructor(
    private appState: AppState,
    private windowFactory: WindowFactory
  ) {
    // Constructor is now minimal
    // All services are managed by ServiceContainer in bootstrap
    // All IPC handlers are registered in IPC modules via bootstrap
    console.log('[Main] Main class initialized')
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
      backgroundColor: '#FFFFFF'
    })

    // Registering a handler for update-target-url tells Electron that the app
    // owns the status-bar display. An intentional no-op suppresses the native
    // Chromium URL bubble that would otherwise appear on link hover.
    this.window.webContents.on('update-target-url', () => {})

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    this.window.on('maximize', () => {
      this.window?.webContents.send('window:maximize-change', true)
    })

    this.window.on('unmaximize', () => {
      this.window?.webContents.send('window:maximize-change', false)
    })

    this.window.on('enter-full-screen', () => {
      this.window?.webContents.send('window:fullscreen-change', true)
    })

    this.window.on('leave-full-screen', () => {
      this.window?.webContents.send('window:fullscreen-change', false)
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
      backgroundColor: '#FFFFFF'
    })

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
      backgroundColor: '#FFFFFF'
    })

    // Registering a handler for update-target-url tells Electron that the app
    // owns the status-bar display. An intentional no-op suppresses the native
    // Chromium URL bubble that would otherwise appear on link hover.
    workspaceWindow.webContents.on('update-target-url', () => {})

    workspaceWindow.once('ready-to-show', () => {
      workspaceWindow.show()
    })

    workspaceWindow.on('maximize', () => {
      workspaceWindow?.webContents.send('window:maximize-change', true)
    })

    workspaceWindow.on('unmaximize', () => {
      workspaceWindow?.webContents.send('window:maximize-change', false)
    })

    workspaceWindow.on('enter-full-screen', () => {
      workspaceWindow?.webContents.send('window:fullscreen-change', true)
    })

    workspaceWindow.on('leave-full-screen', () => {
      workspaceWindow?.webContents.send('window:fullscreen-change', false)
    })

    return workspaceWindow
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }
}
