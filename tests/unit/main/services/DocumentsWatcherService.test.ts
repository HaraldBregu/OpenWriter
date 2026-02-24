/**
 * Tests for DocumentsWatcherService.
 *
 * Strategy:
 *   - Mock 'chokidar' and 'node:fs/promises' so no real file system
 *     operations or OS watchers are started.
 *   - The chokidar mock returns a fake FSWatcher with controllable event
 *     callbacks that allow us to simulate 'add', 'change', 'unlink', and
 *     'error' events by calling watcher.on.mock.calls directly.
 *   - Test lifecycle: initialize, startWatching, stopWatching, destroy.
 *   - Test that isWatching() and getWatchedDirectory() reflect state.
 *   - Test markFileAsWritten + shouldIgnoreFile logic (files marked as
 *     written within the 2 s window are filtered out).
 *   - Test EventBus workspace:changed integration: new workspace starts
 *     a watcher, null workspace stops it.
 *   - Test EventBus broadcast for file events (added, changed, removed)
 *     and watcher errors.
 *   - Test debounced emit: rapid events for the same file path collapse
 *     into a single broadcast.
 *   - Test that temp files and dot-files are NOT broadcast.
 */

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

// Chokidar mock factory: each call to chokidar.watch returns a fresh mock watcher
const mockWatcherInstance = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
}
jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue(mockWatcherInstance),
}))

import chokidar from 'chokidar'
import { DocumentsWatcherService } from '../../../../src/main/services/documents-watcher'
import { EventBus } from '../../../../src/main/core/EventBus'

const mockChokidarWatch = chokidar.watch as jest.Mock

// ---------------------------------------------------------------------------
// Helper to simulate a watcher event
// ---------------------------------------------------------------------------
function triggerWatcherEvent(eventName: string, filePath: string, error?: unknown) {
  const call = mockWatcherInstance.on.mock.calls.find(
    (c: unknown[]) => c[0] === eventName
  )
  if (!call) throw new Error(`Watcher handler for "${eventName}" not registered`)
  const handler = call[1] as (...args: unknown[]) => void
  if (error !== undefined) {
    handler(error)
  } else {
    handler(filePath)
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('DocumentsWatcherService', () => {
  let service: DocumentsWatcherService
  let eventBus: EventBus
  const WORKSPACE = '/fake/workspace'
  const DOCS_DIR = `${WORKSPACE}/documents`

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Make chokidar.watch return the same mock instance each call
    mockChokidarWatch.mockReturnValue(mockWatcherInstance)
    // Reset .on so calls don't accumulate across tests
    mockWatcherInstance.on.mockReturnThis()

    eventBus = new EventBus()
    service = new DocumentsWatcherService(eventBus)
  })

  afterEach(async () => {
    await service.destroy()
    jest.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------

  describe('initialize()', () => {
    it('should start watching when workspace path is provided', async () => {
      await service.initialize(WORKSPACE)
      expect(mockChokidarWatch).toHaveBeenCalledWith(DOCS_DIR, expect.any(Object))
    })

    it('should not start watching when workspace path is null', async () => {
      await service.initialize(null)
      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // startWatching() / stopWatching()
  // -------------------------------------------------------------------------

  describe('startWatching()', () => {
    it('should set isWatching() to true after starting', async () => {
      await service.startWatching(WORKSPACE)
      expect(service.isWatching()).toBe(true)
    })

    it('should set getWatchedDirectory() to the documents subdirectory', async () => {
      await service.startWatching(WORKSPACE)
      expect(service.getWatchedDirectory()).toBe(DOCS_DIR)
    })

    it('should NOT restart when already watching the same directory', async () => {
      await service.startWatching(WORKSPACE)
      mockChokidarWatch.mockClear()

      await service.startWatching(WORKSPACE)

      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })

    it('should create the documents directory before watching', async () => {
      const { mkdir } = await import('node:fs/promises')
      await service.startWatching(WORKSPACE)
      expect(mkdir).toHaveBeenCalledWith(DOCS_DIR, { recursive: true })
    })

    it('should register add/change/unlink/error/ready handlers', async () => {
      await service.startWatching(WORKSPACE)
      const registeredEvents = mockWatcherInstance.on.mock.calls.map((c: unknown[]) => c[0])
      expect(registeredEvents).toContain('add')
      expect(registeredEvents).toContain('change')
      expect(registeredEvents).toContain('unlink')
      expect(registeredEvents).toContain('error')
      expect(registeredEvents).toContain('ready')
    })
  })

  describe('stopWatching()', () => {
    it('should set isWatching() to false after stopping', async () => {
      await service.startWatching(WORKSPACE)
      await service.stopWatching()
      expect(service.isWatching()).toBe(false)
    })

    it('should set getWatchedDirectory() to null after stopping', async () => {
      await service.startWatching(WORKSPACE)
      await service.stopWatching()
      expect(service.getWatchedDirectory()).toBeNull()
    })

    it('should call watcher.close()', async () => {
      await service.startWatching(WORKSPACE)
      await service.stopWatching()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })

    it('should be safe to call when not watching', async () => {
      await expect(service.stopWatching()).resolves.not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // markFileAsWritten + file event filtering
  // -------------------------------------------------------------------------

  describe('markFileAsWritten()', () => {
    it('should suppress file events for marked files within the ignore window', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      const filePath = `${DOCS_DIR}/report.pdf`
      service.markFileAsWritten(filePath)

      // Trigger a 'change' event immediately (within the ignore window)
      triggerWatcherEvent('change', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).not.toHaveBeenCalledWith('documents:file-changed', expect.anything())
    })

    it('should NOT suppress events for files that were NOT marked', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      const filePath = `${DOCS_DIR}/external-edit.pdf`
      triggerWatcherEvent('add', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('documents:file-changed', expect.objectContaining({
        type: 'added',
        filePath,
      }))
    })
  })

  // -------------------------------------------------------------------------
  // File change events
  // -------------------------------------------------------------------------

  describe('file change event broadcasting', () => {
    beforeEach(async () => {
      await service.startWatching(WORKSPACE)
    })

    it('should broadcast "documents:file-changed" for add events', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${DOCS_DIR}/doc.pdf`

      triggerWatcherEvent('add', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('documents:file-changed', expect.objectContaining({
        type: 'added',
        fileId: 'doc.pdf',
        filePath,
      }))
    })

    it('should broadcast "documents:file-changed" for change events', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${DOCS_DIR}/updated.pdf`

      triggerWatcherEvent('change', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('documents:file-changed', expect.objectContaining({
        type: 'changed',
        fileId: 'updated.pdf',
      }))
    })

    it('should broadcast "documents:file-changed" for unlink events', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${DOCS_DIR}/deleted.pdf`

      triggerWatcherEvent('unlink', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('documents:file-changed', expect.objectContaining({
        type: 'removed',
        fileId: 'deleted.pdf',
      }))
    })

    it('should include a timestamp in the broadcast payload', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${DOCS_DIR}/timestamped.pdf`

      triggerWatcherEvent('add', filePath)
      jest.advanceTimersByTime(500)

      const payload = (broadcastSpy.mock.calls[0] as unknown[])[1] as { timestamp: number }
      expect(typeof payload.timestamp).toBe('number')
    })
  })

  // -------------------------------------------------------------------------
  // Watcher error broadcasting
  // -------------------------------------------------------------------------

  describe('watcher error events', () => {
    it('should broadcast "documents:watcher-error" when watcher emits an error', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      triggerWatcherEvent('error', '', new Error('EACCES: permission denied'))

      expect(broadcastSpy).toHaveBeenCalledWith('documents:watcher-error', expect.objectContaining({
        error: expect.stringContaining('EACCES'),
      }))
    })
  })

  // -------------------------------------------------------------------------
  // EventBus workspace:changed integration
  // -------------------------------------------------------------------------

  describe('workspace:changed event integration', () => {
    it('should start watching when workspace:changed fires with a new path', async () => {
      eventBus.emit('workspace:changed', { currentPath: WORKSPACE, previousPath: null })

      // Allow the async startWatching to run
      await Promise.resolve()

      expect(mockChokidarWatch).toHaveBeenCalled()
    })

    it('should stop watching when workspace:changed fires with null path', async () => {
      await service.startWatching(WORKSPACE)

      eventBus.emit('workspace:changed', { currentPath: null, previousPath: WORKSPACE })
      await Promise.resolve()

      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Debounce behaviour
  // -------------------------------------------------------------------------

  describe('debouncing', () => {
    it('should batch multiple rapid change events for the same file into one broadcast', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      const filePath = `${DOCS_DIR}/rapidly-changed.pdf`

      // Fire three rapid change events for the same file
      triggerWatcherEvent('change', filePath)
      triggerWatcherEvent('change', filePath)
      triggerWatcherEvent('change', filePath)

      // Only after the debounce timer fires should we see ONE broadcast
      jest.runAllTimers()

      const fileChangedCalls = broadcastSpy.mock.calls.filter(
        (c: unknown[]) => c[0] === 'documents:file-changed'
      )
      expect(fileChangedCalls).toHaveLength(1)
    })

    it('should emit separate broadcasts for different files', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      triggerWatcherEvent('add', `${DOCS_DIR}/file-a.pdf`)
      triggerWatcherEvent('add', `${DOCS_DIR}/file-b.pdf`)
      jest.runAllTimers()

      const fileChangedCalls = broadcastSpy.mock.calls.filter(
        (c: unknown[]) => c[0] === 'documents:file-changed'
      )
      expect(fileChangedCalls).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('should stop watching on destroy', async () => {
      await service.startWatching(WORKSPACE)
      service.destroy()
      // Give the async stopWatching() inside destroy() a chance to run
      await Promise.resolve()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })

    it('should unsubscribe from workspace:changed on destroy', async () => {
      service.destroy()

      // After destroy, workspace:changed should not trigger startWatching
      mockChokidarWatch.mockClear()
      eventBus.emit('workspace:changed', { currentPath: WORKSPACE, previousPath: null })
      await Promise.resolve()

      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })
  })
})
