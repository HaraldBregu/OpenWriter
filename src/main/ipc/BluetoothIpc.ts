import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { BluetoothService } from '../services/bluetooth'
import { BluetoothChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for Bluetooth information.
 */
export class BluetoothIpc implements IpcModule {
  readonly name = 'bluetooth'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const bluetooth = container.get<BluetoothService>('bluetooth')

    ipcMain.handle(BluetoothChannels.getInfo, () => bluetooth.getBluetoothInfo())
    ipcMain.handle(BluetoothChannels.isSupported, () => bluetooth.isBluetoothSupported())
    ipcMain.handle(BluetoothChannels.getPermissionStatus, () => bluetooth.getBluetoothPermissionStatus())

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
