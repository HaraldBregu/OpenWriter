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

    // Window creation
    ipcMain.handle(
      'window-create-child',
      wrapSimpleHandler(() => windowManager.createChildWindow(), 'window-create-child')
    )
    ipcMain.handle(
      'window-create-modal',
      wrapSimpleHandler(() => windowManager.createModalWindow(), 'window-create-modal')
    )
    ipcMain.handle(
      'window-create-frameless',
      wrapSimpleHandler(() => windowManager.createFramelessWindow(), 'window-create-frameless')
    )
    ipcMain.handle(
      'window-create-widget',
      wrapSimpleHandler(() => windowManager.createWidgetWindow(), 'window-create-widget')
    )

    // Window management
    ipcMain.handle(
      'window-close',
      wrapSimpleHandler((id: number) => windowManager.closeWindow(id), 'window-close')
    )
    ipcMain.handle(
      'window-close-all-managed',
      wrapSimpleHandler(() => windowManager.closeAllManaged(), 'window-close-all-managed')
    )
    ipcMain.handle(
      'window-get-state',
      wrapSimpleHandler(() => windowManager.getState(), 'window-get-state')
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
      'window:get-platform',
      wrapSimpleHandler(() => process.platform, 'window:get-platform')
    )

    // Application popup menu (hamburger button)
    ipcMain.handle(
      'window:popup-menu',
      wrapIpcHandler((event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) return

      const menu = Menu.buildFromTemplate([
        {
          label: 'File',
          submenu: [
            { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => {} },
            { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => {} },
            { type: 'separator' },
            { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => {} },
            { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => {} },
            { type: 'separator' },
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
            { role: 'togglefullscreen' as const }
          ]
        },
        {
          label: 'Help',
          submenu: [{ label: 'About Tesseract AI', click: () => {} }]
        }
      ])

        menu.popup({ window: win })
      }, 'window:popup-menu')
    )

    // Broadcast window state changes to all windows
    windowManager.onStateChange((state) => {
      eventBus.broadcast('window-state-change', state)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
