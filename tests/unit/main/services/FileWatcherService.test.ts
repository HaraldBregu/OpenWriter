/**
 * Tests for FileWatcherService.
 *
 * Strategy:
 *   - Mirror the DocumentsWatcherService test approach: mock chokidar and
 *     trigger events by calling the captured handler callbacks directly.
 *   - Key difference from DocumentsWatcherService: FileWatcherService watches
 *     the "posts" subdirectory, only cares about .json files, and broadcasts
 *     on 'posts:file-changed' / 'posts:watcher-error'.
 *   - Also tests extractPostIdFromFilePath: the post ID is the filename
 *     without the .json extension.
 *   - Tests markFileAsWritten suppression within the ignore window.
 *   - Tests updateConfig restarts the watcher.
 */

// Chokidar mock (no real OS watchers)
const mockWatcherInstance = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
}
jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue(mockWatcherInstance),
}))

import chokidar from 'chokidar'
import { FileWatcherService } from '../../../../src/main/services/file-watcher'
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

describe('FileWatcherService', () => {
  let service: FileWatcherService
  let eventBus: EventBus
  const WORKSPACE = '/fake/workspace'
  const POSTS_DIR = `${WORKSPACE}/posts`

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockChokidarWatch.mockReturnValue(mockWatcherInstance)
    mockWatcherInstance.on.mockReturnThis()

    eventBus = new EventBus()
    service = new FileWatcherService(eventBus)
  })

  afterEach(async () => {
    service.destroy()
    await Promise.resolve()
    jest.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------

  describe('initialize()', () => {
    it('should start watching when workspace path is provided', async () => {
      await service.initialize(WORKSPACE)
      expect(mockChokidarWatch).toHaveBeenCalledWith(POSTS_DIR, expect.any(Object))
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
    it('should set isWatching() to true', async () => {
      await service.startWatching(WORKSPACE)
      expect(service.isWatching()).toBe(true)
    })

    it('should set getWatchedDirectory() to the posts subdirectory', async () => {
      await service.startWatching(WORKSPACE)
      expect(service.getWatchedDirectory()).toBe(POSTS_DIR)
    })

    it('should NOT restart when already watching the same directory', async () => {
      await service.startWatching(WORKSPACE)
      mockChokidarWatch.mockClear()

      await service.startWatching(WORKSPACE)

      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })

    it('should register add/change/unlink/error/ready handlers on the watcher', async () => {
      await service.startWatching(WORKSPACE)
      const registeredEvents = mockWatcherInstance.on.mock.calls.map((c: unknown[]) => c[0])
      expect(registeredEvents).toContain('add')
      expect(registeredEvents).toContain('change')
      expect(registeredEvents).toContain('unlink')
      expect(registeredEvents).toContain('error')
      expect(registeredEvents).toContain('ready')
    })

    it('should restart the watcher when a different workspace is provided', async () => {
      await service.startWatching('/workspace-a')
      mockChokidarWatch.mockClear()

      await service.startWatching('/workspace-b')

      expect(mockWatcherInstance.close).toHaveBeenCalled()
      expect(mockChokidarWatch).toHaveBeenCalledWith('/workspace-b/posts', expect.any(Object))
    })
  })

  describe('stopWatching()', () => {
    it('should set isWatching() to false', async () => {
      await service.startWatching(WORKSPACE)
      await service.stopWatching()
      expect(service.isWatching()).toBe(false)
    })

    it('should call watcher.close()', async () => {
      await service.startWatching(WORKSPACE)
      await service.stopWatching()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })

    it('should clear the watched directory', async () => {
      await service.startWatching(WORKSPACE)
      await service.stopWatching()
      expect(service.getWatchedDirectory()).toBeNull()
    })

    it('should be safe to call when not watching', async () => {
      await expect(service.stopWatching()).resolves.not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // File events → posts:file-changed broadcast
  // -------------------------------------------------------------------------

  describe('file change event broadcasting', () => {
    beforeEach(async () => {
      await service.startWatching(WORKSPACE)
    })

    it('should broadcast "posts:file-changed" with type "added" for new files', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${POSTS_DIR}/post-123.json`

      triggerWatcherEvent('add', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('posts:file-changed', expect.objectContaining({
        type: 'added',
        postId: 'post-123',
        filePath,
      }))
    })

    it('should broadcast "posts:file-changed" with type "changed" for modified files', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${POSTS_DIR}/post-xyz.json`

      triggerWatcherEvent('change', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('posts:file-changed', expect.objectContaining({
        type: 'changed',
        postId: 'post-xyz',
      }))
    })

    it('should broadcast "posts:file-changed" with type "removed" for deleted files', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      const filePath = `${POSTS_DIR}/post-del.json`

      triggerWatcherEvent('unlink', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('posts:file-changed', expect.objectContaining({
        type: 'removed',
        postId: 'post-del',
      }))
    })

    it('should strip the .json extension to extract the postId', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      triggerWatcherEvent('add', `${POSTS_DIR}/my-unique-post-id.json`)
      jest.advanceTimersByTime(500)

      const call = broadcastSpy.mock.calls.find((c) => c[0] === 'posts:file-changed')
      expect((call?.[1] as { postId: string }).postId).toBe('my-unique-post-id')
    })

    it('should include a timestamp in the broadcast payload', () => {
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      triggerWatcherEvent('add', `${POSTS_DIR}/ts-post.json`)
      jest.advanceTimersByTime(500)

      const payload = broadcastSpy.mock.calls[0]?.[1] as { timestamp: number }
      expect(typeof payload.timestamp).toBe('number')
    })
  })

  // -------------------------------------------------------------------------
  // Watcher error events
  // -------------------------------------------------------------------------

  describe('watcher error events', () => {
    it('should broadcast "posts:watcher-error" on watcher errors', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      triggerWatcherEvent('error', '', new Error('Watch failed'))

      expect(broadcastSpy).toHaveBeenCalledWith('posts:watcher-error', expect.objectContaining({
        error: 'Watch failed',
      }))
    })

    it('should handle non-Error watcher errors gracefully', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      triggerWatcherEvent('error', '', 'string error')

      expect(broadcastSpy).toHaveBeenCalledWith('posts:watcher-error', expect.objectContaining({
        error: 'string error',
      }))
    })
  })

  // -------------------------------------------------------------------------
  // markFileAsWritten — ignore-window suppression
  // -------------------------------------------------------------------------

  describe('markFileAsWritten()', () => {
    it('should suppress change events for recently written files', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      const filePath = `${POSTS_DIR}/app-written.json`
      service.markFileAsWritten(filePath)

      triggerWatcherEvent('change', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).not.toHaveBeenCalledWith('posts:file-changed', expect.anything())
    })

    it('should NOT suppress events for files that were not marked', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      const filePath = `${POSTS_DIR}/external.json`
      triggerWatcherEvent('change', filePath)
      jest.advanceTimersByTime(500)

      expect(broadcastSpy).toHaveBeenCalledWith('posts:file-changed', expect.anything())
    })
  })

  // -------------------------------------------------------------------------
  // Debounce behaviour
  // -------------------------------------------------------------------------

  describe('debouncing', () => {
    it('should collapse multiple rapid events for the same file into one broadcast', async () => {
      await service.startWatching(WORKSPACE)
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      const filePath = `${POSTS_DIR}/rapid.json`
      triggerWatcherEvent('change', filePath)
      triggerWatcherEvent('change', filePath)
      triggerWatcherEvent('change', filePath)

      jest.advanceTimersByTime(500)

      const fileChangedCalls = broadcastSpy.mock.calls.filter(
        (c: unknown[]) => c[0] === 'posts:file-changed'
      )
      expect(fileChangedCalls).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  // EventBus workspace:changed integration
  // -------------------------------------------------------------------------

  describe('workspace:changed event integration', () => {
    it('should start watching when workspace:changed fires with a new path', async () => {
      eventBus.emit('workspace:changed', { currentPath: WORKSPACE, previousPath: null })
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
  // updateConfig()
  // -------------------------------------------------------------------------

  describe('updateConfig()', () => {
    it('should restart the watcher with new config when watching', async () => {
      await service.startWatching(WORKSPACE)
      mockChokidarWatch.mockClear()

      await service.updateConfig({ debounceMs: 500 })

      // Should have stopped and restarted
      expect(mockWatcherInstance.close).toHaveBeenCalled()
      expect(mockChokidarWatch).toHaveBeenCalled()
    })

    it('should not restart when not currently watching', async () => {
      await service.updateConfig({ debounceMs: 500 })
      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('should stop the watcher on destroy', async () => {
      await service.startWatching(WORKSPACE)
      service.destroy()
      await Promise.resolve()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })

    it('should unsubscribe from workspace:changed on destroy', () => {
      service.destroy()

      mockChokidarWatch.mockClear()
      eventBus.emit('workspace:changed', { currentPath: WORKSPACE, previousPath: null })

      // No new watch started after destroy
      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })
  })
})
