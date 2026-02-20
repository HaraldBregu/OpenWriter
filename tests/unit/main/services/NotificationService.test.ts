/**
 * Tests for NotificationService.
 * Validates native notification creation, event handling, and callbacks.
 */
import { Notification, BrowserWindow, nativeImage } from 'electron'
import { NotificationService } from '../../../../src/main/services/notification'

// Mock @electron-toolkit/utils
jest.mock('@electron-toolkit/utils', () => ({
  is: { dev: true }
}))

describe('NotificationService', () => {
  let service: NotificationService
  let mockNotificationInstance: { show: jest.Mock; close: jest.Mock; on: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new NotificationService()

    // Mock nativeImage.createFromPath to return an object with isEmpty
    ;(nativeImage.createFromPath as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      getSize: () => ({ width: 32, height: 32 }),
      toDataURL: () => 'data:image/png;base64,icon'
    })

    // Set up the Notification constructor mock to capture the on() calls
    mockNotificationInstance = {
      show: jest.fn(),
      close: jest.fn(),
      on: jest.fn()
    }
    ;(Notification as unknown as jest.Mock).mockImplementation(() => mockNotificationInstance)
  })

  describe('isSupported', () => {
    it('should delegate to Notification.isSupported', () => {
      const result = service.isSupported()
      expect(Notification.isSupported).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('showNotification', () => {
    it('should create a notification and return an ID', () => {
      const id = service.showNotification({ title: 'Test', body: 'Hello' })
      expect(id).toMatch(/^notification-/)
      expect(Notification).toHaveBeenCalled()
      expect(mockNotificationInstance.show).toHaveBeenCalled()
    })

    it('should register show, click, and close event handlers', () => {
      service.showNotification({ title: 'Test', body: 'Body' })
      const onCalls = mockNotificationInstance.on.mock.calls
      const eventNames = onCalls.map((call: unknown[]) => call[0])
      expect(eventNames).toContain('show')
      expect(eventNames).toContain('click')
      expect(eventNames).toContain('close')
    })

    it('should pass silent option', () => {
      service.showNotification({ title: 'Test', body: 'Body', silent: true })
      const constructorArgs = (Notification as unknown as jest.Mock).mock.calls[0][0]
      expect(constructorArgs.silent).toBe(true)
    })

    it('should return unique IDs for each notification', () => {
      const id1 = service.showNotification({ title: 'A', body: 'B' })
      const id2 = service.showNotification({ title: 'C', body: 'D' })
      expect(id1).not.toBe(id2)
    })
  })

  describe('onNotificationEvent', () => {
    it('should register a callback and return an unsubscribe function', () => {
      const callback = jest.fn()
      const unsub = service.onNotificationEvent(callback)
      expect(typeof unsub).toBe('function')
    })

    it('should emit shown event to registered callbacks', () => {
      const callback = jest.fn()
      service.onNotificationEvent(callback)

      // Show a notification then trigger the 'show' handler
      service.showNotification({ title: 'Test', body: 'Body' })
      const showHandler = mockNotificationInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'show'
      )?.[1] as () => void
      showHandler()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test',
          body: 'Body',
          action: 'shown'
        })
      )
    })

    it('should emit clicked event and focus window', () => {
      const callback = jest.fn()
      service.onNotificationEvent(callback)

      service.showNotification({ title: 'Click', body: 'Me' })
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'click'
      )?.[1] as () => void
      clickHandler()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'clicked' })
      )
      // Should try to focus the window
      const mockWin = BrowserWindow.getAllWindows()[0]
      expect(mockWin.show).toHaveBeenCalled()
      expect(mockWin.focus).toHaveBeenCalled()
    })

    it('should emit closed event', () => {
      const callback = jest.fn()
      service.onNotificationEvent(callback)

      service.showNotification({ title: 'Close', body: 'Me' })
      const closeHandler = mockNotificationInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      )?.[1] as () => void
      closeHandler()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'closed' })
      )
    })

    it('should stop receiving events after unsubscribe', () => {
      const callback = jest.fn()
      const unsub = service.onNotificationEvent(callback)
      unsub()

      service.showNotification({ title: 'T', body: 'B' })
      const showHandler = mockNotificationInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'show'
      )?.[1] as () => void
      showHandler()

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
