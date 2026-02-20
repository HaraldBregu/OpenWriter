import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'

export interface WindowPreset {
  name: string
  options: Partial<BrowserWindowConstructorOptions>
}

/**
 * Factory for creating BrowserWindow instances with consistent configuration.
 * Eliminates duplicated webPreferences and window config across Main,
 * WindowManagerService, and WorkspaceSelector.
 */
export class WindowFactory {
  private readonly baseWebPreferences: Electron.WebPreferences = {
    preload: path.join(__dirname, '../preload/index.mjs'),
    sandbox: false,
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
      width: 1200,
      height: 800,
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
