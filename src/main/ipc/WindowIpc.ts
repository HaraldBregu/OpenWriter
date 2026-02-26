import { ipcMain, BrowserWindow, Menu, app } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WindowManagerService } from '../services/window-manager'
import type { AppState } from '../core/AppState'
import { wrapIpcHandler, wrapSimpleHandler } from './IpcErrorHandler'

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
      'wm-create-child',
      wrapSimpleHandler(() => windowManager.createChildWindow(), 'wm-create-child')
    )
    ipcMain.handle(
      'wm-create-modal',
      wrapSimpleHandler(() => windowManager.createModalWindow(), 'wm-create-modal')
    )
    ipcMain.handle(
      'wm-create-frameless',
      wrapSimpleHandler(() => windowManager.createFramelessWindow(), 'wm-create-frameless')
    )
    ipcMain.handle(
      'wm-create-widget',
      wrapSimpleHandler(() => windowManager.createWidgetWindow(), 'wm-create-widget')
    )

    // Window management — channel names must match what the preload's window.wm namespace calls
    ipcMain.handle(
      'wm-close-window',
      wrapSimpleHandler((id: number) => windowManager.closeWindow(id), 'wm-close-window')
    )
    ipcMain.handle(
      'wm-close-all',
      wrapSimpleHandler(() => windowManager.closeAllManaged(), 'wm-close-all')
    )
    ipcMain.handle(
      'wm-get-state',
      wrapSimpleHandler(() => windowManager.getState(), 'wm-get-state')
    )

    // Window control handlers
    ipcMain.on('window:minimize', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize()
    })

    ipcMain.on('window:maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    })

    ipcMain.on('window:close', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close()
    })

    ipcMain.handle(
      'window:is-maximized',
      wrapIpcHandler(
        (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false,
        'window:is-maximized'
      )
    )

    ipcMain.handle(
      'window:is-fullscreen',
      wrapIpcHandler(
        (event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false,
        'window:is-fullscreen'
      )
    )

    ipcMain.handle(
      'window:get-platform',
      wrapSimpleHandler(() => process.platform, 'window:get-platform')
    )

    // Application popup menu (hamburger button)
    // NOTE: Uses ipcMain.handle directly (not wrapIpcHandler) to match the
    // working context-menu pattern. The async wrapper in wrapIpcHandler can
    // interfere with the synchronous menu.popup() call.
    ipcMain.handle('window:popup-menu', (event) => {

      console.log('Received request to open application menu')

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
