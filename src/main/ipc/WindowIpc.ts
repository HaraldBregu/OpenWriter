import { ipcMain, BrowserWindow, Menu as ElectronMenu, type IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import { wrapIpcHandler } from './IpcErrorHandler'
import { WindowChannels } from '../../shared/channels'

/**
 * IPC handlers for window management operations.
 *
 * Channels (send/on):
 *  - window:minimize   (send) -- Minimize the window
 *  - window:maximize   (send) -- Toggle maximize state
 *  - window:close      (send) -- Close the window
 *  - window:popup-menu (send) -- Show application menu as popup (Windows/Linux)
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
        const menu = ElectronMenu.getApplicationMenu()
        if (menu) {
          menu.popup({ window: win })
        }
      }
    })

    // --- Query handlers (invoke/handle) ---

    ipcMain.handle(
      WindowChannels.isMaximized,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        return win ? win.isMaximized() : false
      }, 'window:is-maximized')
    )

    ipcMain.handle(
      WindowChannels.isFullScreen,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        return win ? win.isFullScreen() : false
      }, 'window:is-fullscreen')
    )

    ipcMain.handle(WindowChannels.getPlatform, wrapIpcHandler(() => {
      return process.platform
    }, 'window:get-platform'))

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
