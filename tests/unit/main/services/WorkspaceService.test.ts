/**
 * Tests for WorkspaceService workspace deletion detection.
 *
 * Validates that when the workspace folder is externally deleted,
 * the service detects the deletion and emits the appropriate events.
 */

import fs from 'node:fs'

// We need to import the real module but mock specific behaviors
jest.mock('node:fs')

// Minimal mock for StoreService
const mockStore = {
  getCurrentWorkspace: jest.fn().mockReturnValue(null),
  setCurrentWorkspace: jest.fn(),
  clearCurrentWorkspace: jest.fn(),
  getRecentWorkspaces: jest.fn().mockReturnValue([]),
  removeRecentWorkspace: jest.fn()
}

// Minimal mock for EventBus
const mockEventBus = {
  emit: jest.fn(),
  broadcast: jest.fn(),
  on: jest.fn().mockReturnValue(jest.fn())
}

import { WorkspaceService } from '../../../../src/main/services/workspace'

describe('WorkspaceService', () => {
  let service: WorkspaceService

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    service = new WorkspaceService(mockStore as any, mockEventBus as any)
  })

  afterEach(() => {
    service.destroy()
    jest.useRealTimers()
  })

  describe('initialize()', () => {
    it('should restore workspace when persisted path exists', () => {
      mockStore.getCurrentWorkspace.mockReturnValue('/valid/workspace')
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })

      service.initialize()

      expect(service.getCurrent()).toBe('/valid/workspace')
    })

    it('should clear workspace when persisted path no longer exists', () => {
      mockStore.getCurrentWorkspace.mockReturnValue('/deleted/workspace')
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      service.initialize()

      expect(service.getCurrent()).toBeNull()
      expect(mockStore.clearCurrentWorkspace).toHaveBeenCalled()
    })

    it('should start validation timer when workspace is restored', () => {
      mockStore.getCurrentWorkspace.mockReturnValue('/valid/workspace')
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })

      service.initialize()

      // Simulate the folder being deleted after initialization
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })
      ;(fs.existsSync as jest.Mock).mockReturnValue(true) // parent exists

      // Advance timer past the validation interval (5 seconds)
      jest.advanceTimersByTime(6000)

      // Should have emitted workspace:deleted
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'workspace:deleted',
        expect.objectContaining({
          deletedPath: '/valid/workspace',
          reason: 'deleted'
        })
      )
    })
  })

  describe('setCurrent()', () => {
    it('should validate and set the workspace path', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })

      service.setCurrent('/new/workspace')

      expect(service.getCurrent()).toBe('/new/workspace')
      expect(mockStore.setCurrentWorkspace).toHaveBeenCalledWith('/new/workspace')
      expect(mockEventBus.emit).toHaveBeenCalledWith('workspace:changed', {
        currentPath: '/new/workspace',
        previousPath: null
      })
    })

    it('should throw when path does not exist', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      expect(() => service.setCurrent('/nonexistent/path')).toThrow()
    })

    it('should throw when path is not a directory', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false })

      expect(() => service.setCurrent('/some/file.txt')).toThrow()
    })
  })

  describe('workspace deletion detection', () => {
    beforeEach(() => {
      // Set up a valid workspace
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })
      service.setCurrent('/my/workspace')
      jest.clearAllMocks()
    })

    it('should detect when workspace folder is deleted', () => {
      // Make the folder appear as deleted
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })
      ;(fs.existsSync as jest.Mock).mockReturnValue(true) // parent exists

      // Advance past the validation interval
      jest.advanceTimersByTime(6000)

      // Should clear workspace
      expect(service.getCurrent()).toBeNull()

      // Should emit workspace:deleted event
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'workspace:deleted',
        expect.objectContaining({
          deletedPath: '/my/workspace',
          reason: 'deleted'
        })
      )

      // Should broadcast to renderer
      expect(mockEventBus.broadcast).toHaveBeenCalledWith(
        'workspace:deleted',
        expect.objectContaining({
          deletedPath: '/my/workspace',
          reason: 'deleted'
        })
      )
    })

    it('should emit workspace:changed with null when workspace is deleted', () => {
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT')
      })
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)

      jest.advanceTimersByTime(6000)

      // clear() should have emitted workspace:changed
      expect(mockEventBus.emit).toHaveBeenCalledWith('workspace:changed', {
        currentPath: null,
        previousPath: '/my/workspace'
      })
    })

    it('should report reason as inaccessible when parent dir does not exist', () => {
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT')
      })
      ;(fs.existsSync as jest.Mock).mockReturnValue(false) // parent gone too

      jest.advanceTimersByTime(6000)

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'workspace:deleted',
        expect.objectContaining({
          reason: 'inaccessible'
        })
      )
    })

    it('should not emit deletion event when workspace is still valid', () => {
      // Folder still exists
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })

      jest.advanceTimersByTime(6000)

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'workspace:deleted',
        expect.anything()
      )
      expect(service.getCurrent()).toBe('/my/workspace')
    })

    it('should stop the validation timer after detecting deletion', () => {
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT')
      })
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)

      // First tick detects deletion
      jest.advanceTimersByTime(6000)
      jest.clearAllMocks()

      // Subsequent ticks should NOT emit again (timer should be stopped)
      jest.advanceTimersByTime(12000)

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'workspace:deleted',
        expect.anything()
      )
    })
  })

  describe('clear()', () => {
    it('should stop the validation timer', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })
      service.setCurrent('/workspace')
      jest.clearAllMocks()

      service.clear()

      // Make fs.statSync throw to verify timer is not running
      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT')
      })

      jest.advanceTimersByTime(12000)

      // Should not have emitted workspace:deleted since timer was stopped
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'workspace:deleted',
        expect.anything()
      )
    })
  })

  describe('destroy()', () => {
    it('should clean up the validation timer', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true })
      service.setCurrent('/workspace')

      service.destroy()
      jest.clearAllMocks()

      ;(fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT')
      })

      jest.advanceTimersByTime(12000)

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'workspace:deleted',
        expect.anything()
      )
    })
  })
})
