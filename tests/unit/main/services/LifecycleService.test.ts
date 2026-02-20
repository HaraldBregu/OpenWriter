/**
 * Tests for LifecycleService.
 * Validates app lifecycle management, events, and single instance locking.
 */
import { app, BrowserWindow } from 'electron'
import { LifecycleService } from '../../../../src/main/services/lifecycle'

describe('LifecycleService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(app.requestSingleInstanceLock as jest.Mock).mockReturnValue(true)
  })

  describe('constructor', () => {
    it('should request single instance lock', () => {
      new LifecycleService()
      expect(app.requestSingleInstanceLock).toHaveBeenCalled()
    })

    it('should quit app when another instance is already running', () => {
      ;(app.requestSingleInstanceLock as jest.Mock).mockReturnValue(false)
      const service = new LifecycleService()
      expect(app.quit).toHaveBeenCalled()
      // isSingleInstance should be false
      const state = service.getState()
      expect(state.isSingleInstance).toBe(false)
    })

    it('should register second-instance handler', () => {
      new LifecycleService()
      expect(app.on).toHaveBeenCalledWith('second-instance', expect.any(Function))
    })

    it('should call onSecondInstanceFile callback when argv contains .tsrct file', () => {
      const onFile = jest.fn()
      new LifecycleService({ onSecondInstanceFile: onFile })

      // Find and call the second-instance handler
      const secondInstanceCall = (app.on as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'second-instance'
      )
      const handler = secondInstanceCall[1]
      handler({}, ['electron', '--flag', '/path/to/doc.tsrct'])

      expect(onFile).toHaveBeenCalledWith('/path/to/doc.tsrct')
    })

    it('should focus existing window on second instance without file', () => {
      new LifecycleService()

      const secondInstanceCall = (app.on as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'second-instance'
      )
      const handler = secondInstanceCall[1]
      handler({}, ['electron'])

      const mockWin = BrowserWindow.getAllWindows()[0]
      expect(mockWin.focus).toHaveBeenCalled()
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
      expect(state.isSingleInstance).toBe(true)
      expect(state.platform).toBe(process.platform)
      expect(state.events).toEqual([])
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
