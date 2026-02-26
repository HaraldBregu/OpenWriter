import { ipcMain, BrowserWindow, Menu, app } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WindowManagerService } from '../services/window-manager'
import type { AppState } from '../core/AppState'
import { wrapIpcHandler, wrapSimpleHandler } from './IpcErrorHandler'
import { WindowChannels, WmChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for window management operations.
 * Uses EventBus to broadcast window state changes.
 */
export class WindowIpc implements IpcModule {
  readonly name = 'window'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const windowManager = container.get<WindowManagerService>('windowManager')
    const appState = container.get<AppState>('appState')

    // Window creation — channel names must match what the preload's window.wm namespace calls
    ipcMain.handle(
      WmChannels.createChild,
      wrapSimpleHandler(() => windowManager.createChildWindow(), WmChannels.createChild)
    )
    ipcMain.handle(
      WmChannels.createModal,
      wrapSimpleHandler(() => windowManager.createModalWindow(), WmChannels.createModal)
    )
    ipcMain.handle(
      WmChannels.createFrameless,
      wrapSimpleHandler(() => windowManager.createFramelessWindow(), WmChannels.createFrameless)
    )
    ipcMain.handle(
      WmChannels.createWidget,
      wrapSimpleHandler(() => windowManager.createWidgetWindow(), WmChannels.createWidget)
    )

    // Window management — channel names must match what the preload's window.wm namespace calls
    ipcMain.handle(
      WmChannels.closeWindow,
      wrapSimpleHandler((id: number) => windowManager.closeWindow(id), WmChannels.closeWindow)
    )
    ipcMain.handle(
      WmChannels.closeAll,
      wrapSimpleHandler(() => windowManager.closeAllManaged(), WmChannels.closeAll)
    )
    ipcMain.handle(
      WmChannels.getState,
      wrapSimpleHandler(() => windowManager.getState(), WmChannels.getState)
    )

    // Window control handlers
    ipcMain.on(WindowChannels.minimize, (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize()
    })

    ipcMain.on(WindowChannels.maximize, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    })

    ipcMain.on(WindowChannels.close, (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close()
    })

    ipcMain.handle(
      WindowChannels.isMaximized,
      wrapIpcHandler(
        (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false,
        WindowChannels.isMaximized
      )
    )

    ipcMain.handle(
      WindowChannels.isFullScreen,
      wrapIpcHandler(
        (event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false,
        WindowChannels.isFullScreen
      )
    )

    ipcMain.handle(
      WindowChannels.getPlatform,
      wrapSimpleHandler(() => process.platform, WindowChannels.getPlatform)
    )

    // Application popup menu (hamburger button)
    // Uses ipcMain.on + ipcRenderer.send (fire-and-forget) to match the
    // proven working pattern used by context-menu and context-menu-editable
    // in CustomIpc. The ipcMain.handle + ipcRenderer.invoke pattern was
    // silently failing for this channel.
    ipcMain.on(WindowChannels.popupMenu, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const menu = Menu.buildFromTemplate([
        {
          label: 'File',
          submenu: [
            { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => { win.webContents.send('menu:new-file') } },
            { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => { win.webContents.send('menu:open-file') } },
            { type: 'separator' as const },
            { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => { win.webContents.send('menu:save') } },
            { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => { win.webContents.send('menu:save-as') } },
            { type: 'separator' as const },
            {
              label: 'Exit',
              click: () => {
                appState.setQuitting()
                app.quit()
              }
            }
          ]
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' as const },
            { role: 'redo' as const },
            { type: 'separator' as const },
            { role: 'cut' as const },
            { role: 'copy' as const },
            { role: 'paste' as const },
            { role: 'selectAll' as const }
          ]
        },
        {
          label: 'View',
          submenu: [
            { role: 'reload' as const },
            { role: 'forceReload' as const },
            { type: 'separator' as const },
            { role: 'zoomIn' as const },
            { role: 'zoomOut' as const },
            { role: 'resetZoom' as const },
            { type: 'separator' as const },
            { role: 'togglefullscreen' as const },
            { type: 'separator' as const },
            {
              label: 'Toggle Console',
              accelerator: 'CmdOrCtrl+Shift+I',
              click: () => {
                win.webContents.toggleDevTools()
              }
            }
          ]
        },
        {
          label: 'Help',
          submenu: [{ label: 'About OpenWriter', click: () => { win.webContents.send('menu:about') } }]
        }
      ])

      menu.popup({ window: win })
    })

    // Broadcast window state changes to all windows
    windowManager.onStateChange((state) => {
      eventBus.broadcast('window-state-change', state)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
