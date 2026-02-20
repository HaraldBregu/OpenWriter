import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { LifecycleService } from '../services/lifecycle'

/**
 * IPC handlers for application lifecycle operations.
 * Uses EventBus to broadcast lifecycle events.
 */
export class LifecycleIpc implements IpcModule {
  readonly name = 'lifecycle'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const lifecycle = container.get<LifecycleService>('lifecycle')

    ipcMain.handle('lifecycle-get-state', () => lifecycle.getState())
    ipcMain.handle('lifecycle-get-events', () => lifecycle.getEvents())
    ipcMain.handle('lifecycle-restart', () => lifecycle.restart())

    // Broadcast lifecycle events to all windows
    lifecycle.onEvent((event) => {
      eventBus.broadcast('lifecycle-event', event)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
