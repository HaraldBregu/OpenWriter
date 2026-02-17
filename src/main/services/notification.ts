import { Notification, nativeImage, app, BrowserWindow } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'

interface NotificationOptions {
  title: string
  body: string
  silent?: boolean
  urgency?: 'normal' | 'critical' | 'low'
}

interface NotificationResult {
  id: string
  title: string
  body: string
  timestamp: number
  action: 'clicked' | 'closed' | 'shown'
}

type NotificationCallback = (result: NotificationResult) => void

export class NotificationService {
  private callbacks: NotificationCallback[] = []
  private notificationCount = 0

  /**
   * Check if notifications are supported on the current platform
   */
  isSupported(): boolean {
    return Notification.isSupported()
  }

  /**
   * Show a native system notification
   */
  showNotification(options: NotificationOptions): string {
    const id = `notification-${Date.now()}-${++this.notificationCount}`

    // Get app icon path — __dirname resolves to out/main/ regardless of source file location
    const iconPath = is.dev
      ? path.join(__dirname, '../../resources/icons/icon.png')
      : path.join(process.resourcesPath, 'resources/icons/icon.png')

    const icon = nativeImage.createFromPath(iconPath)

    const notificationOptions: Electron.NotificationConstructorOptions = {
      title: options.title,
      body: options.body,
      silent: options.silent || false,
      timeoutType: 'default'
    }

    // Only set icon if the image loaded successfully (avoids silent failure on bad path)
    if (!icon.isEmpty()) {
      notificationOptions.icon = icon
    }

    // urgency is Linux-only — skip on other platforms to avoid silent failures
    if (process.platform === 'linux') {
      notificationOptions.urgency = options.urgency || 'normal'
    }

    const notification = new Notification(notificationOptions)

    // Handle notification shown
    notification.on('show', () => {
      this.emitResult({
        id,
        title: options.title,
        body: options.body,
        timestamp: Date.now(),
        action: 'shown'
      })
    })

    // Handle notification clicked - bring app to focus
    notification.on('click', () => {
      this.emitResult({
        id,
        title: options.title,
        body: options.body,
        timestamp: Date.now(),
        action: 'clicked'
      })

      // Focus the main window
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const mainWindow = windows[0]
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()

        // On macOS, also show the app in the dock
        if (process.platform === 'darwin') {
          app.show()
        }
      }
    })

    // Handle notification closed
    notification.on('close', () => {
      this.emitResult({
        id,
        title: options.title,
        body: options.body,
        timestamp: Date.now(),
        action: 'closed'
      })
    })

    notification.show()

    return id
  }

  /**
   * Register a callback for notification events
   */
  onNotificationEvent(callback: NotificationCallback): () => void {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Emit notification result to all registered callbacks
   */
  private emitResult(result: NotificationResult): void {
    this.callbacks.forEach((callback) => callback(result))
  }
}
