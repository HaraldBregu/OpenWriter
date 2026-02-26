import { ipcMain, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import { wrapIpcHandler } from './IpcErrorHandler'
import { WindowChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for window management operations.
 *
 * Channels (send/on):
 *  - window:minimize  (send) -- Minimize the window
 *  - window:maximize  (send) -- Toggle maximize state
 *  - window:close     (send) -- Close the window
 *
 * Channels (invoke/handle):
 *  - window:is-maximized  (query) -- Check if window is maximized
 *  - window:is-fullscreen (query) -- Check if window is in fullscreen
 *  - window:get-platform  (query) -- Get platform info
 *
 * Event channels (push):
 *  - window:maximize-change  -- Window maximize state changed
 *  - window:fullscreen-change -- Window fullscreen state changed
 */
export class WindowIpc implements IpcModule {
  readonly name = 'window'

  register(_container: ServiceContainer, _eventBus: EventBus): void {
    // --- Send handlers (fire-and-forget) ---

    ipcMain.on(WindowChannels.minimize, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) win.minimize()
    })

    ipcMain.on(WindowChannels.maximize, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        if (win.isMaximized()) {
          win.unmaximize()
        } else {
          win.maximize()
        }
      }
    })

    ipcMain.on(WindowChannels.close, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) win.close()
    })

    ipcMain.on(WindowChannels.popupMenu, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        // This is handled by the application's menu setup
        // Just acknowledge the request
      }
    })

    // --- Query handlers (invoke/handle) ---

    registerQuery(WindowChannels.isMaximized, (event: Electron.IpcMainInvokeEvent) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      return win ? win.isMaximized() : false
    })

    registerQuery(WindowChannels.isFullScreen, (event: Electron.IpcMainInvokeEvent) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      return win ? win.isFullScreen() : false
    })

    registerQuery(WindowChannels.getPlatform, () => {
      return process.platform
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
