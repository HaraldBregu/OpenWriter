import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WindowManagerService } from '../services/window-manager'

/**
 * IPC handlers for window management operations.
 * Uses EventBus to broadcast window state changes.
 */
export class WindowIpc implements IpcModule {
  readonly name = 'window'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const windowManager = container.get<WindowManagerService>('windowManager')

    // Window creation
    ipcMain.handle('window-create-child', () => windowManager.createChildWindow())
    ipcMain.handle('window-create-modal', () => windowManager.createModalWindow())
    ipcMain.handle('window-create-frameless', () => windowManager.createFramelessWindow())
    ipcMain.handle('window-create-widget', () => windowManager.createWidgetWindow())

    // Window management
    ipcMain.handle('window-close', (_e, id: number) => windowManager.closeWindow(id))
    ipcMain.handle('window-close-all-managed', () => windowManager.closeAllManaged())
    ipcMain.handle('window-get-state', () => windowManager.getState())

    // Broadcast window state changes to all windows
    windowManager.onStateChange((state) => {
      eventBus.broadcast('window-state-change', state)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
