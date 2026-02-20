/**
 * Tests for BluetoothIpc.
 * Verifies Bluetooth IPC handler registrations.
 */
import { ipcMain } from 'electron'
import { BluetoothIpc } from '../../../../src/main/ipc/BluetoothIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('BluetoothIpc', () => {
  let module: BluetoothIpc
  let container: ServiceContainer
  let eventBus: EventBus

  beforeEach(() => {
    jest.clearAllMocks()

    const mockBluetooth = {
      getBluetoothInfo: jest.fn().mockReturnValue({ supported: true }),
      isBluetoothSupported: jest.fn().mockReturnValue(true),
      getBluetoothPermissionStatus: jest.fn().mockResolvedValue('prompt')
    }

    container = new ServiceContainer()
    container.register('bluetooth', mockBluetooth)
    eventBus = new EventBus()
    module = new BluetoothIpc()
  })

  it('should have name "bluetooth"', () => {
    expect(module.name).toBe('bluetooth')
  })

  it('should register 3 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(3)
  })

  it('should register bluetooth channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('bluetooth-get-info')
    expect(channels).toContain('bluetooth-is-supported')
    expect(channels).toContain('bluetooth-get-permission-status')
  })
})
