import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'

export interface WindowPreset {
  name: string
  options: Partial<BrowserWindowConstructorOptions>
}

/**
 * Factory for creating BrowserWindow instances with consistent configuration.
 * Eliminates duplicated webPreferences and window config across Main
 * and WindowManagerService.
 */
export class WindowFactory {
  private readonly preloadPath: string

  constructor() {
    // Use path.resolve to ensure absolute path
    this.preloadPath = path.resolve(__dirname, '../preload/index.mjs')
    console.log('[WindowFactory] Preload path:', this.preloadPath)
  }

  private readonly baseWebPreferences: Electron.WebPreferences = {
    preload: this.preloadPath,
    sandbox: true,
    nodeIntegration: false,
    contextIsolation: true,
    devTools: is.dev,
    webSecurity: true,
    allowRunningInsecureContent: false
  }

  private readonly iconPath = path.join(__dirname, '../../resources/icons/icon.png')

  /**
   * Create a BrowserWindow with base security defaults merged with overrides.
   */
  create(overrides: Partial<BrowserWindowConstructorOptions> = {}): BrowserWindow {
    const options: BrowserWindowConstructorOptions = {
      width: 1600,
      height: 1000,
      minWidth: 800,
      minHeight: 600,
      show: false,
      icon: this.iconPath,
      ...overrides,
      webPreferences: {
        ...this.baseWebPreferences,
        ...overrides.webPreferences
      }
    }

    const win = new BrowserWindow(options)

    // Prevent arbitrary window.open() calls from creating unrestricted windows
    win.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' }
    })

    // Prevent navigation to external URLs
    win.webContents.on('will-navigate', (event, url) => {
      const appUrl = process.env['ELECTRON_RENDERER_URL'] || 'file://'
      if (is.dev) {
        // In dev mode, only allow navigation within the dev server
        if (!url.startsWith(appUrl) && !url.startsWith('file://')) {
          event.preventDefault()
        }
      } else {
        // In production, only allow file:// URLs (local files)
        if (!url.startsWith('file://')) {
          event.preventDefault()
        }
      }
    })

    this.loadContent(win)
    return win
  }

  /**
   * Load the renderer content (dev URL or production file).
   */
  loadContent(win: BrowserWindow, hash?: string): void {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const url = hash
        ? `${process.env['ELECTRON_RENDERER_URL']}#/${hash}`
        : process.env['ELECTRON_RENDERER_URL']
      win.loadURL(url)
    } else {
      const loadOptions = hash ? { hash } : undefined
      win.loadFile(path.join(__dirname, '../renderer/index.html'), loadOptions)
    }
  }
}
