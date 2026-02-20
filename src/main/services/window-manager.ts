import { BrowserWindow } from 'electron'
import type { WindowFactory } from '../core/WindowFactory'
import { Observable, type Unsubscribe } from '../core/Observable'

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

export class WindowManagerService extends Observable<WindowManagerState> {
  private managedWindows: Map<number, ManagedWindowInfo> = new Map()
  private windowFactory: WindowFactory | null = null

  /**
   * Set the WindowFactory for creating windows.
   * Called during service initialization in bootstrap.
   */
  setWindowFactory(factory: WindowFactory): void {
    this.windowFactory = factory
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
    if (!this.windowFactory) {
      throw new Error('WindowFactory not set. Call setWindowFactory() first.')
    }

    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    const win = this.windowFactory.create({
      width: 800,
      height: 600,
      parent: parent || undefined,
      title: 'Child Window'
    })

    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'child', 'Child Window')
  }

  createModalWindow(): ManagedWindowInfo {
    if (!this.windowFactory) {
      throw new Error('WindowFactory not set. Call setWindowFactory() first.')
    }

    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    const win = this.windowFactory.create({
      width: 500,
      height: 400,
      parent: parent || undefined,
      modal: true,
      title: 'Modal Window',
      resizable: false,
      minimizable: false,
      maximizable: false
    })

    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'modal', 'Modal Window')
  }

  createFramelessWindow(): ManagedWindowInfo {
    if (!this.windowFactory) {
      throw new Error('WindowFactory not set. Call setWindowFactory() first.')
    }

    const win = this.windowFactory.create({
      width: 700,
      height: 500,
      frame: false,
      title: 'Frameless Window',
      transparent: false
    })

    win.once('ready-to-show', () => win.show())
    return this.trackWindow(win, 'frameless', 'Frameless Window')
  }

  createWidgetWindow(): ManagedWindowInfo {
    if (!this.windowFactory) {
      throw new Error('WindowFactory not set. Call setWindowFactory() first.')
    }

    const win = this.windowFactory.create({
      width: 300,
      height: 200,
      alwaysOnTop: true,
      frame: false,
      title: 'Widget',
      resizable: true,
      skipTaskbar: true,
      transparent: false
    })

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

  onStateChange(callback: (state: WindowManagerState) => void): Unsubscribe {
    return this.subscribe(callback)
  }

  destroy(): void {
    this.closeAllManaged()
    this.clearSubscribers()
  }

  private notifyStateChange(): void {
    this.notify(this.getState())
  }
}
