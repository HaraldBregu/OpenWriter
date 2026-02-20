/**
 * Tests for EventBus - the main process event system.
 *
 * EventBus serves two purposes:
 *   1. broadcast/sendTo: Main -> Renderer IPC communication
 *   2. emit/on/off: Typed main-process internal events
 */

jest.mock('electron')

import { BrowserWindow } from 'electron'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
    jest.clearAllMocks()
  })

  describe('broadcast', () => {
    it('should send a message to all open windows', () => {
      // Arrange
      const mockWin1 = { isDestroyed: jest.fn().mockReturnValue(false), webContents: { send: jest.fn() } }
      const mockWin2 = { isDestroyed: jest.fn().mockReturnValue(false), webContents: { send: jest.fn() } }
      ;(BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([mockWin1, mockWin2])

      // Act
      eventBus.broadcast('test-channel', 'payload1', 'payload2')

      // Assert
      expect(mockWin1.webContents.send).toHaveBeenCalledWith('test-channel', 'payload1', 'payload2')
      expect(mockWin2.webContents.send).toHaveBeenCalledWith('test-channel', 'payload1', 'payload2')
    })

    it('should skip destroyed windows', () => {
      // Arrange
      const aliveWin = { isDestroyed: jest.fn().mockReturnValue(false), webContents: { send: jest.fn() } }
      const deadWin = { isDestroyed: jest.fn().mockReturnValue(true), webContents: { send: jest.fn() } }
      ;(BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([aliveWin, deadWin])

      // Act
      eventBus.broadcast('update', { data: 'test' })

      // Assert
      expect(aliveWin.webContents.send).toHaveBeenCalledWith('update', { data: 'test' })
      expect(deadWin.webContents.send).not.toHaveBeenCalled()
    })
  })

  describe('sendTo', () => {
    it('should send a message to a specific window by ID', () => {
      // Arrange
      const mockWin = { isDestroyed: jest.fn().mockReturnValue(false), webContents: { send: jest.fn() } }
      ;(BrowserWindow.fromId as jest.Mock).mockReturnValue(mockWin)

      // Act
      eventBus.sendTo(1, 'specific-channel', { key: 'value' })

      // Assert
      expect(BrowserWindow.fromId).toHaveBeenCalledWith(1)
      expect(mockWin.webContents.send).toHaveBeenCalledWith('specific-channel', { key: 'value' })
    })

    it('should do nothing if the window does not exist', () => {
      // Arrange
      ;(BrowserWindow.fromId as jest.Mock).mockReturnValue(null)

      // Act & Assert - should not throw
      eventBus.sendTo(999, 'channel', 'data')
    })

    it('should do nothing if the window is destroyed', () => {
      // Arrange
      const mockWin = { isDestroyed: jest.fn().mockReturnValue(true), webContents: { send: jest.fn() } }
      ;(BrowserWindow.fromId as jest.Mock).mockReturnValue(mockWin)

      // Act
      eventBus.sendTo(1, 'channel', 'data')

      // Assert
      expect(mockWin.webContents.send).not.toHaveBeenCalled()
    })
  })

  describe('emit / on (main process events)', () => {
    it('should deliver events to subscribers', () => {
      // Arrange
      const callback = jest.fn()
      eventBus.on('service:initialized', callback)

      // Act
      eventBus.emit('service:initialized', { service: 'store' })

      // Assert
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'service:initialized',
          payload: { service: 'store' },
          timestamp: expect.any(Number)
        })
      )
    })

    it('should support multiple subscribers for the same event', () => {
      // Arrange
      const cb1 = jest.fn()
      const cb2 = jest.fn()
      eventBus.on('error:critical', cb1)
      eventBus.on('error:critical', cb2)

      // Act
      eventBus.emit('error:critical', { error: new Error('test'), context: 'startup' })

      // Assert
      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })

    it('should return an unsubscribe function', () => {
      // Arrange
      const callback = jest.fn()
      const unsubscribe = eventBus.on('service:destroyed', callback)

      // Act
      unsubscribe()
      eventBus.emit('service:destroyed', { service: 'test' })

      // Assert
      expect(callback).not.toHaveBeenCalled()
    })

    it('should not crash if a subscriber throws', () => {
      // Arrange
      const badCallback = jest.fn().mockImplementation(() => {
        throw new Error('subscriber error')
      })
      const goodCallback = jest.fn()
      eventBus.on('service:initialized', badCallback)
      eventBus.on('service:initialized', goodCallback)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Act
      eventBus.emit('service:initialized', { service: 'test' })

      // Assert - the good callback was still invoked
      expect(goodCallback).toHaveBeenCalledTimes(1)
      consoleSpy.mockRestore()
    })
  })

  describe('off', () => {
    it('should remove all listeners for a specific event type', () => {
      // Arrange
      const cb1 = jest.fn()
      const cb2 = jest.fn()
      eventBus.on('window:created', cb1)
      eventBus.on('window:created', cb2)

      // Act
      eventBus.off('window:created')
      eventBus.emit('window:created', { windowId: 1, type: 'main' })

      // Assert
      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).not.toHaveBeenCalled()
    })
  })

  describe('clearAllListeners', () => {
    it('should remove all listeners for all event types', () => {
      // Arrange
      const cb1 = jest.fn()
      const cb2 = jest.fn()
      eventBus.on('service:initialized', cb1)
      eventBus.on('window:closed', cb2)

      // Act
      eventBus.clearAllListeners()
      eventBus.emit('service:initialized', { service: 'test' })
      eventBus.emit('window:closed', { windowId: 1 })

      // Assert
      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).not.toHaveBeenCalled()
    })
  })
})
