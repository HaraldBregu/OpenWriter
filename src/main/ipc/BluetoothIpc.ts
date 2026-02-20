import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { BluetoothService } from '../services/bluetooth'

/**
 * IPC handlers for Bluetooth information.
 */
export class BluetoothIpc implements IpcModule {
  readonly name = 'bluetooth'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const bluetooth = container.get<BluetoothService>('bluetooth')

    ipcMain.handle('bluetooth-get-info', () => bluetooth.getBluetoothInfo())
    ipcMain.handle('bluetooth-is-supported', () => bluetooth.isBluetoothSupported())
    ipcMain.handle('bluetooth-get-permission-status', () => bluetooth.getBluetoothPermissionStatus())

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
