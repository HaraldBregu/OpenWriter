/**
 * Tests for PostsIpc.
 *
 * Strategy:
 *   - Verifies module name, handler count (4), and channel names.
 *   - Tests the sync handler's happy path (all posts synced), partial
 *     failure path (some write errors) and the no-workspace error path.
 *   - Tests update-post, delete-post (including ENOENT idempotency), and
 *     load-from-workspace (caching logic, missing directory, validation).
 *   - Mocks node:fs/promises at the module level so no real disk I/O occurs.
 *
 * Note: PostsIpc uses fs/promises directly (not via a service), so we mock
 * the entire 'node:fs/promises' module.  The WorkspaceService and the
 * optional FileWatcherService are both passed through the windowContextManager
 * lookup chain.
 */

// Mock fs/promises before any imports that use it
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  readFile: jest.fn(),
  unlink: jest.fn().mockResolvedValue(undefined),
}))

import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import { PostsIpc } from '../../../../src/main/ipc/PostsIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

const mockAccess = fs.access as jest.Mock
const mockMkdir = fs.mkdir as jest.Mock
const mockWriteFile = fs.writeFile as jest.Mock
const mockRename = fs.rename as jest.Mock
const mockReaddir = fs.readdir as jest.Mock
const mockReadFile = fs.readFile as jest.Mock
const mockUnlink = fs.unlink as jest.Mock

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE_PATH = '/fake/workspace'

function makeServices(workspacePath: string | null = WORKSPACE_PATH) {
  const mockWorkspace = { getCurrent: jest.fn().mockReturnValue(workspacePath) }
  const mockFileWatcher = { markFileAsWritten: jest.fn() }
  return { mockWorkspace, mockFileWatcher }
}

function buildContainer(mockWorkspace: unknown, mockFileWatcher: unknown) {
  const mockWindowContext = {
    getService: jest.fn().mockImplementation((key: string) => {
      if (key === 'workspace') return mockWorkspace
      if (key === 'fileWatcher') return mockFileWatcher
      throw new Error(`Unknown service: ${key}`)
    }),
  }
  const mockWindowContextManager = { get: jest.fn().mockReturnValue(mockWindowContext) }
  const container = new ServiceContainer()
  container.register('windowContextManager', mockWindowContextManager)
  return container
}

const MOCK_EVENT = { sender: { id: 1 } } as unknown as Electron.IpcMainInvokeEvent

function getHandler(channel: string) {
  const entry = (ipcMain.handle as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === channel)
  if (!entry) throw new Error(`Handler for channel "${channel}" not registered`)
  return entry[1] as (...args: unknown[]) => Promise<unknown>
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

function makePost(id: string) {
  return {
    id,
    title: `Post ${id}`,
    blocks: [{ id: 'b1', content: 'Hello' }],
    category: 'tech',
    tags: ['ai'],
    visibility: 'public',
    createdAt: 1705320000000,
    updatedAt: 1705320000000,
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PostsIpc', () => {
  const EXPECTED_CHANNELS = [
    'posts:sync-to-workspace',
    'posts:update-post',
    'posts:delete-post',
    'posts:load-from-workspace',
  ]

  let module: PostsIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockWorkspace: { getCurrent: jest.Mock }
  let mockFileWatcher: { markFileAsWritten: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    const services = makeServices()
    mockWorkspace = services.mockWorkspace
    mockFileWatcher = services.mockFileWatcher

    container = buildContainer(mockWorkspace, mockFileWatcher)
    eventBus = new EventBus()
    module = new PostsIpc()
    module.register(container, eventBus)
  })

  // -------------------------------------------------------------------------
  // Module metadata
  // -------------------------------------------------------------------------

  it('should have name "posts"', () => {
    expect(module.name).toBe('posts')
  })

  it(`should register ${EXPECTED_CHANNELS.length} ipcMain handlers`, () => {
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(EXPECTED_CHANNELS.length)
  })

  it('should register all expected channels', () => {
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    for (const ch of EXPECTED_CHANNELS) {
      expect(channels).toContain(ch)
    }
  })

  // -------------------------------------------------------------------------
  // posts:sync-to-workspace
  // -------------------------------------------------------------------------

  describe('posts:sync-to-workspace handler', () => {
    it('should sync all posts and return success result', async () => {
      // Directory already exists (no ENOENT)
      mockAccess.mockResolvedValue(undefined)

      const handler = getHandler('posts:sync-to-workspace')
      const posts = [makePost('post-1'), makePost('post-2')]

      const result = await handler(MOCK_EVENT, posts) as { success: boolean; data: { success: boolean; syncedCount: number; failedCount: number } }
      expect(result.success).toBe(true)
      expect(result.data.success).toBe(true)
      expect(result.data.syncedCount).toBe(2)
      expect(result.data.failedCount).toBe(0)
    })

    it('should create posts directory when it does not exist', async () => {
      // First access throws ENOENT (directory missing), mkdir then succeeds
      const enoent = Object.assign(new Error('Not found'), { code: 'ENOENT' })
      mockAccess.mockRejectedValue(enoent)

      const handler = getHandler('posts:sync-to-workspace')
      const result = await handler(MOCK_EVENT, [makePost('post-1')]) as { success: boolean }
      expect(result.success).toBe(true)
      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('posts'), { recursive: true })
    })

    it('should return error response when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      const handler = getHandler('posts:sync-to-workspace')
      const result = await handler(MOCK_EVENT, [makePost('post-1')]) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should mark files as written via fileWatcher before writing each post', async () => {
      mockAccess.mockResolvedValue(undefined)

      const handler = getHandler('posts:sync-to-workspace')
      await handler(MOCK_EVENT, [makePost('post-abc')])

      // markFileAsWritten is called with the final file path (before rename)
      expect(mockFileWatcher.markFileAsWritten).toHaveBeenCalledWith(
        expect.stringContaining('post-abc.json')
      )
    })

    it('should report partial failures when individual writes fail', async () => {
      mockAccess.mockResolvedValue(undefined)
      // First post write succeeds; second fails
      mockWriteFile
        .mockResolvedValueOnce(undefined)   // tmp write for post-1
        .mockRejectedValueOnce(new Error('Disk error')) // tmp write for post-2

      const handler = getHandler('posts:sync-to-workspace')
      const result = await handler(MOCK_EVENT, [makePost('post-1'), makePost('post-2')]) as {
        success: boolean
        data: { success: boolean; syncedCount: number; failedCount: number; errors?: Array<{ postId: string }> }
      }
      expect(result.success).toBe(true)
      // One succeeded, one failed
      expect(result.data.syncedCount).toBe(1)
      expect(result.data.failedCount).toBe(1)
      expect(result.data.success).toBe(false)
      expect(result.data.errors).toHaveLength(1)
      expect(result.data.errors?.[0].postId).toBe('post-2')
    })
  })

  // -------------------------------------------------------------------------
  // posts:update-post
  // -------------------------------------------------------------------------

  describe('posts:update-post handler', () => {
    it('should write the post file atomically', async () => {
      mockAccess.mockResolvedValue(undefined)

      const handler = getHandler('posts:update-post')
      const result = await handler(MOCK_EVENT, makePost('post-xyz')) as { success: boolean }
      expect(result.success).toBe(true)
      expect(mockWriteFile).toHaveBeenCalled()
      expect(mockRename).toHaveBeenCalled()
    })

    it('should return error when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      const handler = getHandler('posts:update-post')
      const result = await handler(MOCK_EVENT, makePost('post-xyz')) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // posts:delete-post
  // -------------------------------------------------------------------------

  describe('posts:delete-post handler', () => {
    it('should delete the post file', async () => {
      const handler = getHandler('posts:delete-post')
      const result = await handler(MOCK_EVENT, 'post-to-delete') as { success: boolean }
      expect(result.success).toBe(true)
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('post-to-delete.json')
      )
    })

    it('should succeed idempotently when post file does not exist', async () => {
      const enoent = Object.assign(new Error('Not found'), { code: 'ENOENT' })
      mockUnlink.mockRejectedValueOnce(enoent)

      const handler = getHandler('posts:delete-post')
      const result = await handler(MOCK_EVENT, 'already-deleted') as { success: boolean }
      // ENOENT is treated as a no-op, not an error
      expect(result.success).toBe(true)
    })

    it('should return error when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      const handler = getHandler('posts:delete-post')
      const result = await handler(MOCK_EVENT, 'post-id') as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should propagate non-ENOENT fs errors', async () => {
      const eperm = Object.assign(new Error('Permission denied'), { code: 'EPERM' })
      mockUnlink.mockRejectedValueOnce(eperm)

      const handler = getHandler('posts:delete-post')
      const result = await handler(MOCK_EVENT, 'post-id') as { success: boolean; error: { message: string } }
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Failed to delete post')
    })
  })

  // -------------------------------------------------------------------------
  // posts:load-from-workspace
  // -------------------------------------------------------------------------

  describe('posts:load-from-workspace handler', () => {
    it('should return empty array when posts directory does not exist', async () => {
      const enoent = Object.assign(new Error('Not found'), { code: 'ENOENT' })
      mockAccess.mockRejectedValueOnce(enoent)

      const handler = getHandler('posts:load-from-workspace')
      const result = await handler(MOCK_EVENT) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should load valid posts from JSON files', async () => {
      const post = makePost('post-abc')
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValueOnce(['post-abc.json', 'not-json.txt'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(post))

      const handler = getHandler('posts:load-from-workspace')
      const result = await handler(MOCK_EVENT) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect((result.data[0] as typeof post).id).toBe('post-abc')
    })

    it('should skip files with invalid JSON gracefully', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValueOnce(['broken.json'])
      mockReadFile.mockResolvedValueOnce('{ not valid json }}}')

      const handler = getHandler('posts:load-from-workspace')
      const result = await handler(MOCK_EVENT) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })

    it('should skip post files missing required fields', async () => {
      const invalidPost = { title: 'No id field', blocks: [] }
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValueOnce(['invalid.json'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidPost))

      const handler = getHandler('posts:load-from-workspace')
      const result = await handler(MOCK_EVENT) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })

    it('should return error when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      const handler = getHandler('posts:load-from-workspace')
      const result = await handler(MOCK_EVENT) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return cached posts on second call within TTL', async () => {
      const post = makePost('cached-post')
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValueOnce(['cached-post.json'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(post))

      const handler = getHandler('posts:load-from-workspace')

      // First call populates the cache
      await handler(MOCK_EVENT)
      // Second call should use the cache — readdir should only be called once
      await handler(MOCK_EVENT)

      // readdir was called only once (second call hit cache)
      expect(mockReaddir).toHaveBeenCalledTimes(1)
    })
  })
})
