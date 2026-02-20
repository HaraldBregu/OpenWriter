import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { NetworkService } from '../services/network'

/**
 * IPC handlers for network information.
 */
export class NetworkIpc implements IpcModule {
  readonly name = 'network'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const network = container.get<NetworkService>('network')

    ipcMain.handle('network-get-interfaces', () => network.getNetworkInterfaces())
    ipcMain.handle('network-get-info', () => network.getNetworkInfo())
    ipcMain.handle('network-get-connection-status', () => network.getConnectionStatus())
    ipcMain.handle('network-is-supported', () => network.isNetworkSupported())

    // Start monitoring and broadcast status changes
    network.startMonitoring((status) => {
      eventBus.broadcast('network-status-change', status)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
