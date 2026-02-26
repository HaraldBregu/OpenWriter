import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { NetworkService } from '../services/network'
import { NetworkChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for network information.
 */
export class NetworkIpc implements IpcModule {
  readonly name = 'network'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const network = container.get<NetworkService>('network')

    ipcMain.handle(NetworkChannels.getInterfaces, () => network.getNetworkInterfaces())
    ipcMain.handle(NetworkChannels.getInfo, () => network.getNetworkInfo())
    ipcMain.handle(NetworkChannels.getConnectionStatus, () => network.getConnectionStatus())
    ipcMain.handle(NetworkChannels.isSupported, () => network.isNetworkSupported())

    // Start monitoring and broadcast status changes
    network.startMonitoring((status) => {
      eventBus.broadcast('network-status-change', status)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
