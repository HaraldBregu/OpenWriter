import { BrowserWindow } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import type { AppState } from './core/AppState'

export class Main {
  private window: BrowserWindow | null = null
  private onWindowVisibilityChange?: () => void

  constructor(private appState: AppState) {
    // Constructor is now minimal
    // All services are managed by ServiceContainer in bootstrap
    // All IPC handlers are registered in IPC modules via bootstrap
    console.log('[Main] Main class initialized')
  }

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      // titleBarStyle: 'hidden', // optional macOS polish
      // titleBarStyle: "hiddenInset",
      // titleBarOverlay: true,
      icon: path.join(__dirname, '../../resources/icons/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        devTools: is.dev,
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      frame: false,
      titleBarStyle: 'hidden',
      trafficLightPosition: {
        x: 16,
        y: 16,
      },
      backgroundColor: '#FFFFFF'
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.window.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    this.window.on('maximize', () => {
      this.window?.webContents.send('window:maximize-change', true)
    })

    this.window.on('unmaximize', () => {
      this.window?.webContents.send('window:maximize-change', false)
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
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      icon: path.join(__dirname, '../../resources/icons/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        devTools: is.dev,
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      trafficLightPosition: {
        x: 9,
        y: 9
      },
      backgroundColor: '#FFFFFF'
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    win.once('ready-to-show', () => {
      win.show()
      win.webContents.send('file-opened', filePath)
    })

    return win
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }
}
