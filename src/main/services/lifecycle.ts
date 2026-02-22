import { app } from 'electron'

export interface LifecycleEvent {
  type: string
  timestamp: number
  detail?: string
}

export interface LifecycleState {
  events: LifecycleEvent[]
  appReadyAt: number | null
  platform: string
}

/**
 * LifecycleService manages application lifecycle events.
 *
 * NOTE: This service does NOT enforce single instance lock.
 * Multiple instances of the app can run simultaneously, including:
 * - Multiple launcher instances
 * - Multiple workspace instances
 *
 * This provides maximum flexibility for users to run the app
 * as many times as they want.
 */
export class LifecycleService {
  private events: LifecycleEvent[] = []
  private appReadyAt: number | null = null
  private eventCallback: ((event: LifecycleEvent) => void) | null = null

  constructor() {
    // No single instance lock - allow multiple instances of the app
    console.log('[LifecycleService] Multiple instances allowed - no single instance lock')
    this.pushEvent('app-initialized', 'LifecycleService initialized')
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
