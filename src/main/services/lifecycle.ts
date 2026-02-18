import { app, BrowserWindow } from 'electron'
import path from 'node:path'

export interface LifecycleEvent {
  type: string
  timestamp: number
  detail?: string
}

export interface LifecycleState {
  isSingleInstance: boolean
  events: LifecycleEvent[]
  appReadyAt: number | null
  platform: string
}

export interface LifecycleCallbacks {
  onSecondInstanceFile?: (filePath: string) => void
}

export class LifecycleService {
  private events: LifecycleEvent[] = []
  private isSingleInstance: boolean
  private appReadyAt: number | null = null
  private eventCallback: ((event: LifecycleEvent) => void) | null = null

  constructor(callbacks?: LifecycleCallbacks) {
    this.isSingleInstance = app.requestSingleInstanceLock()

    if (!this.isSingleInstance) {
      app.quit()
      return
    }

    app.on('second-instance', (_event, argv) => {
      this.pushEvent('second-instance-blocked', 'Another instance attempted to launch')

      // Check if argv contains a .tsrct file path (Windows/Linux double-click)
      const filePath = argv.find(
        (arg) => path.extname(arg).toLowerCase() === '.tsrct'
      )

      if (filePath && callbacks?.onSecondInstanceFile) {
        callbacks.onSecondInstanceFile(filePath)
      } else {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          if (windows[0].isMinimized()) windows[0].restore()
          windows[0].focus()
        }
      }
    })
  }

  initialize(): void {
    this.appReadyAt = Date.now()
    this.pushEvent('app-ready', `Platform: ${process.platform}`)

    app.on('before-quit', () => {
      this.pushEvent('before-quit')
    })

    app.on('window-all-closed', () => {
      this.pushEvent('window-all-closed')
    })

    app.on('activate', () => {
      this.pushEvent('activate')
    })
  }

  getState(): LifecycleState {
    return {
      isSingleInstance: this.isSingleInstance,
      events: [...this.events],
      appReadyAt: this.appReadyAt,
      platform: process.platform
    }
  }

  getEvents(): LifecycleEvent[] {
    return [...this.events]
  }

  restart(): void {
    this.pushEvent('app-restarting')
    app.relaunch()
    app.exit(0)
  }

  onEvent(callback: (event: LifecycleEvent) => void): void {
    this.eventCallback = callback
  }

  private pushEvent(type: string, detail?: string): void {
    const event: LifecycleEvent = {
      type,
      timestamp: Date.now(),
      detail
    }
    this.events.push(event)
    this.eventCallback?.(event)
  }
}
