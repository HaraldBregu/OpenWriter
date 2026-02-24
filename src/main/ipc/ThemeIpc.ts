import { ipcMain, BrowserWindow, nativeTheme } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'

const VALID_THEMES = ['light', 'dark', 'system'] as const

/**
 * IPC handler for theme synchronization between renderer and main process.
 * Receives theme changes from the renderer, updates nativeTheme,
 * emits on EventBus for menu sync, and broadcasts to sibling windows.
 */
export class ThemeIpc implements IpcModule {
  readonly name = 'theme'

  private lastTheme: string | null = null

  register(_container: ServiceContainer, eventBus: EventBus): void {
    ipcMain.on('set-theme', (event, theme: string) => {
      if (!VALID_THEMES.includes(theme as (typeof VALID_THEMES)[number])) return

      // Deduplicate to prevent loops in multi-window scenarios
      if (this.lastTheme === theme) return
      this.lastTheme = theme

      nativeTheme.themeSource = theme as 'light' | 'dark' | 'system'

      eventBus.emit('theme:changed', { theme: theme as 'light' | 'dark' | 'system' })

      // Broadcast to sibling windows (exclude sender)
      const senderContents = event.sender
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents !== senderContents) {
          win.webContents.send('change-theme', theme)
        }
      })
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
