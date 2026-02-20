/**
 * Tests for LifecycleIpc.
 * Verifies lifecycle IPC handlers and EventBus broadcasting.
 */
import { ipcMain } from 'electron'
import { LifecycleIpc } from '../../../../src/main/ipc/LifecycleIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('LifecycleIpc', () => {
  let module: LifecycleIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockLifecycle: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockLifecycle = {
      getState: jest.fn().mockReturnValue({ isSingleInstance: true }),
      getEvents: jest.fn().mockReturnValue([]),
      restart: jest.fn(),
      onEvent: jest.fn()
    }

    container = new ServiceContainer()
    container.register('lifecycle', mockLifecycle)
    eventBus = new EventBus()
    module = new LifecycleIpc()
  })

  it('should have name "lifecycle"', () => {
    expect(module.name).toBe('lifecycle')
  })

  it('should register 3 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(3)
  })

  it('should register lifecycle channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('lifecycle-get-state')
    expect(channels).toContain('lifecycle-get-events')
    expect(channels).toContain('lifecycle-restart')
  })

  it('should broadcast lifecycle events via EventBus', () => {
    const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
    module.register(container, eventBus)

    expect(mockLifecycle.onEvent).toHaveBeenCalled()
    const callback = mockLifecycle.onEvent.mock.calls[0][0]
    callback({ type: 'app-ready', timestamp: 1000 })

    expect(broadcastSpy).toHaveBeenCalledWith('lifecycle-event', {
      type: 'app-ready',
      timestamp: 1000
    })
  })
})
