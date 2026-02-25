/**
 * Tests for LifecycleService.
 * Validates app lifecycle management, events, and single instance locking.
 */
import { app } from 'electron'
import { LifecycleService } from '../../../../src/main/services/lifecycle'

describe('LifecycleService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize without single instance lock', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      new LifecycleService()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple instances allowed')
      )
      consoleLogSpy.mockRestore()
    })

    it('should push app-initialized event on construction', () => {
      const service = new LifecycleService()
      const state = service.getState()
      expect(state.events.some((e) => e.type === 'app-initialized')).toBe(true)
    })
  })

  describe('initialize', () => {
    it('should set appReadyAt timestamp and push app-ready event', () => {
      const service = new LifecycleService()
      service.initialize()
      const state = service.getState()
      expect(state.appReadyAt).toBeDefined()
      expect(state.appReadyAt).not.toBeNull()
      expect(state.events.some((e) => e.type === 'app-ready')).toBe(true)
    })

    it('should register before-quit, window-all-closed, and activate listeners', () => {
      const service = new LifecycleService()
      service.initialize()
      const appOnCalls = (app.on as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
      expect(appOnCalls).toContain('before-quit')
      expect(appOnCalls).toContain('window-all-closed')
      expect(appOnCalls).toContain('activate')
    })
  })

  describe('getState', () => {
    it('should return current lifecycle state', () => {
      const service = new LifecycleService()
      const state = service.getState()
      expect(state.platform).toBe(process.platform)
      expect(state.events.length).toBeGreaterThan(0) // Should include app-initialized event
      expect(state.appReadyAt).toBeNull()
    })
  })

  describe('getEvents', () => {
    it('should return copy of events array', () => {
      const service = new LifecycleService()
      service.initialize()
      const events = service.getEvents()
      expect(events.length).toBeGreaterThan(0)
      // Verify it is a copy
      events.push({ type: 'fake', timestamp: 0 })
      expect(service.getEvents().length).toBeLessThan(events.length)
    })
  })

  describe('restart', () => {
    it('should relaunch and exit app', () => {
      const service = new LifecycleService()
      service.restart()
      expect(app.relaunch).toHaveBeenCalled()
      expect(app.exit).toHaveBeenCalledWith(0)
    })

    it('should push app-restarting event', () => {
      const service = new LifecycleService()
      service.restart()
      const events = service.getEvents()
      expect(events.some((e) => e.type === 'app-restarting')).toBe(true)
    })
  })

  describe('onEvent', () => {
    it('should call callback when events are pushed', () => {
      const service = new LifecycleService()
      const callback = jest.fn()
      service.onEvent(callback)
      service.initialize()
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'app-ready' })
      )
    })
  })
})
