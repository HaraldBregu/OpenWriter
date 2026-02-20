/**
 * Tests for NetworkIpc.
 * Verifies network IPC handler registrations and EventBus integration.
 */
import { ipcMain } from 'electron'
import { NetworkIpc } from '../../../../src/main/ipc/NetworkIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('NetworkIpc', () => {
  let module: NetworkIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockNetwork: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockNetwork = {
      getNetworkInterfaces: jest.fn().mockReturnValue([]),
      getNetworkInfo: jest.fn().mockReturnValue({}),
      getConnectionStatus: jest.fn().mockResolvedValue('online'),
      isNetworkSupported: jest.fn().mockReturnValue(true),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      notifyStatusChange: jest.fn()
    }

    container = new ServiceContainer()
    container.register('network', mockNetwork)
    eventBus = new EventBus()
    module = new NetworkIpc()
  })

  it('should have name "network"', () => {
    expect(module.name).toBe('network')
  })

  it('should register 4 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(4)
  })

  it('should register all network channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('network-get-interfaces')
    expect(channels).toContain('network-get-info')
    expect(channels).toContain('network-get-connection-status')
    expect(channels).toContain('network-is-supported')
  })

  it('should start monitoring and broadcast status changes via EventBus', () => {
    const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
    module.register(container, eventBus)

    expect(mockNetwork.startMonitoring).toHaveBeenCalled()

    // Simulate a status change by calling the callback passed to startMonitoring
    const monitorCallback = mockNetwork.startMonitoring.mock.calls[0][0]
    monitorCallback('offline')

    expect(broadcastSpy).toHaveBeenCalledWith('network-status-change', 'offline')
  })
})
