import { BrowserWindow } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'

export type ManagedWindowType = 'child' | 'modal' | 'frameless' | 'widget'

export interface ManagedWindowInfo {
  id: number
  type: ManagedWindowType
  title: string
  createdAt: number
}

export interface WindowManagerState {
  windows: ManagedWindowInfo[]
}

export class WindowManagerService {
  private managedWindows: Map<number, ManagedWindowInfo> = new Map()
  private eventCallback: ((state: WindowManagerState) => void) | null = null

  private getPreloadPath(): string {
    return path.join(__dirname, '../preload/index.mjs')
  }

  private loadContent(win: BrowserWindow): void {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'))
    }
  }

  private trackWindow(win: BrowserWindow, type: ManagedWindowType, title: string): ManagedWindowInfo {
    const info: ManagedWindowInfo = {
      id: win.id,
      type,
      title,
      createdAt: Date.now()
    }
    this.managedWindows.set(win.id, info)

    win.on('closed', () => {
      this.managedWindows.delete(info.id)
      this.notifyStateChange()
    })

    this.notifyStateChange()
    return info
  }

  createChildWindow(): ManagedWindowInfo {
    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      parent: parent || undefined,
      title: 'Child Window',
      show: false,
      webPreferences: {
        preload: this.getPreloadPath(),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    this.loadContent(win)
    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'child', 'Child Window')
  }

  createModalWindow(): ManagedWindowInfo {
    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    const win = new BrowserWindow({
      width: 500,
      height: 400,
      parent: parent || undefined,
      modal: true,
      title: 'Modal Window',
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        preload: this.getPreloadPath(),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    this.loadContent(win)
    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'modal', 'Modal Window')
  }

  createFramelessWindow(): ManagedWindowInfo {
    const win = new BrowserWindow({
      width: 700,
      height: 500,
      frame: false,
      title: 'Frameless Window',
      show: false,
      transparent: false,
      webPreferences: {
        preload: this.getPreloadPath(),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    this.loadContent(win)
    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'frameless', 'Frameless Window')
  }

  createWidgetWindow(): ManagedWindowInfo {
    const win = new BrowserWindow({
      width: 300,
      height: 200,
      alwaysOnTop: true,
      frame: false,
      title: 'Widget',
      show: false,
      resizable: true,
      skipTaskbar: true,
      transparent: false,
      webPreferences: {
        preload: this.getPreloadPath(),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    this.loadContent(win)
    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'widget', 'Floating Widget')
  }

  closeWindow(id: number): boolean {
    const win = BrowserWindow.fromId(id)
    if (win && !win.isDestroyed()) {
      win.close()
      return true
    }
    return false
  }

  closeAllManaged(): void {
    for (const [id] of this.managedWindows) {
      const win = BrowserWindow.fromId(id)
      if (win && !win.isDestroyed()) {
        win.close()
      }
    }
  }

  getState(): WindowManagerState {
    return {
      windows: Array.from(this.managedWindows.values())
    }
  }

  onStateChange(callback: (state: WindowManagerState) => void): void {
    this.eventCallback = callback
  }

  destroy(): void {
    this.closeAllManaged()
  }

  private notifyStateChange(): void {
    this.eventCallback?.(this.getState())
  }
}
