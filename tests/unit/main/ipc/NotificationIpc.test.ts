/**
 * Tests for NotificationIpc.
 * Verifies notification IPC handlers and EventBus broadcasting.
 */
import { ipcMain } from 'electron'
import { NotificationIpc } from '../../../../src/main/ipc/NotificationIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('NotificationIpc', () => {
  let module: NotificationIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockNotification: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockNotification = {
      showNotification: jest.fn().mockReturnValue('notif-1'),
      isSupported: jest.fn().mockReturnValue(true),
      onNotificationEvent: jest.fn().mockReturnValue(() => {})
    }

    container = new ServiceContainer()
    container.register('notification', mockNotification)
    eventBus = new EventBus()
    module = new NotificationIpc()
  })

  it('should have name "notification"', () => {
    expect(module.name).toBe('notification')
  })

  it('should register 2 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(2)
  })

  it('should register notification channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('notification-show')
    expect(channels).toContain('notification-is-supported')
  })

  it('should broadcast notification events via EventBus', () => {
    const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
    module.register(container, eventBus)

    expect(mockNotification.onNotificationEvent).toHaveBeenCalled()
    const callback = mockNotification.onNotificationEvent.mock.calls[0][0]
    callback({ id: 'n1', action: 'shown' })

    expect(broadcastSpy).toHaveBeenCalledWith('notification-event', { id: 'n1', action: 'shown' })
  })
})
