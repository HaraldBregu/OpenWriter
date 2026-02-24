/**
 * Tests for OutputIpc.
 *
 * Strategy:
 *   - Verifies module name, handler count, and channel registration.
 *   - Exercises every handler's happy-path logic by calling the wrapped
 *     handler directly and asserting on both the return value and the
 *     service method that was invoked.
 *   - Validates input validation branches (missing type, invalid type,
 *     missing content, bad metadata, missing id) that all produce
 *     success:false responses via wrapIpcHandler.
 *   - Uses a realistic mock event that satisfies the windowContextManager
 *     lookup chain used by getWindowService.
 */
import { ipcMain } from 'electron'
import { OutputIpc } from '../../../../src/main/ipc/OutputIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock event whose windowContextManager lookup resolves. */
function makeMockEvent(mockService: unknown) {
  const mockWindowContext = { getService: jest.fn().mockReturnValue(mockService) }
  const mockWindowContextManager = { get: jest.fn().mockReturnValue(mockWindowContext) }
  return {
    event: { sender: { id: 1 } } as unknown as Electron.IpcMainInvokeEvent,
    mockWindowContextManager,
  }
}

/** Extract a registered ipcMain.handle handler by channel name. */
function getHandler(channel: string) {
  const calls = (ipcMain.handle as jest.Mock).mock.calls
  const entry = calls.find((c: unknown[]) => c[0] === channel)
  if (!entry) throw new Error(`Handler for channel "${channel}" was not registered`)
  return entry[1] as (...args: unknown[]) => Promise<unknown>
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('OutputIpc', () => {
  const EXPECTED_CHANNELS = [
    'output:save',
    'output:update',
    'output:load-all',
    'output:load-by-type',
    'output:load-one',
    'output:delete',
  ]

  let module: OutputIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockOutputFiles: Record<string, jest.Mock>

  const SAMPLE_SAVE_RESULT = { id: '2024-01-15_120000', path: '/ws/output/posts/2024-01-15_120000', savedAt: 1705320000000 }
  const SAMPLE_OUTPUT_FILE = {
    id: '2024-01-15_120000',
    type: 'posts' as const,
    path: '/ws/output/posts/2024-01-15_120000',
    metadata: {
      title: 'My Post',
      type: 'posts' as const,
      category: 'tech',
      tags: ['ai'],
      visibility: 'public',
      provider: 'openai',
      model: 'gpt-4o',
      createdAt: '2024-01-15T12:00:00.000Z',
      updatedAt: '2024-01-15T12:00:00.000Z',
    },
    content: '# Hello',
    savedAt: 1705320000000,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockOutputFiles = {
      save: jest.fn().mockResolvedValue(SAMPLE_SAVE_RESULT),
      update: jest.fn().mockResolvedValue(undefined),
      loadAll: jest.fn().mockResolvedValue([SAMPLE_OUTPUT_FILE]),
      loadByType: jest.fn().mockResolvedValue([SAMPLE_OUTPUT_FILE]),
      loadOne: jest.fn().mockResolvedValue(SAMPLE_OUTPUT_FILE),
      delete: jest.fn().mockResolvedValue(undefined),
    }

    const { mockWindowContextManager } = makeMockEvent(mockOutputFiles)
    container = new ServiceContainer()
    container.register('windowContextManager', mockWindowContextManager)

    eventBus = new EventBus()
    module = new OutputIpc()
    module.register(container, eventBus)
  })

  // -------------------------------------------------------------------------
  // Module metadata and registration
  // -------------------------------------------------------------------------

  it('should have name "output"', () => {
    expect(module.name).toBe('output')
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
  // output:save
  // -------------------------------------------------------------------------

  describe('output:save handler', () => {
    const VALID_INPUT = {
      type: 'posts' as const,
      content: '# Hello world',
      metadata: {
        title: 'Hello',
        category: 'tech',
        tags: [],
        visibility: 'public',
        provider: 'openai',
        model: 'gpt-4o',
      },
    }

    it('should call outputFiles.save and return the result', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event, VALID_INPUT) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toEqual(SAMPLE_SAVE_RESULT)
      expect(mockOutputFiles.save).toHaveBeenCalledWith(VALID_INPUT)
    })

    it('should return error when type is missing', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_INPUT, type: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error for an invalid output type', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_INPUT, type: 'invalid-type' }) as { success: boolean; error: { message: string } }
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Invalid output type')
    })

    it('should return error when content is not a string', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_INPUT, content: 42 }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when metadata is an array instead of object', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_INPUT, metadata: [] }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when metadata is null', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_INPUT, metadata: null }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should accept "writings" as a valid output type', async () => {
      const handler = getHandler('output:save')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_INPUT, type: 'writings' }) as { success: boolean }
      expect(result.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // output:update
  // -------------------------------------------------------------------------

  describe('output:update handler', () => {
    const VALID_PARAMS = {
      type: 'posts' as const,
      id: '2024-01-15_120000',
      content: 'Updated content',
      metadata: { title: 'Updated', category: 'tech', tags: [], visibility: 'public', provider: 'openai', model: 'gpt-4o' },
    }

    it('should call outputFiles.update with the correct args', async () => {
      const handler = getHandler('output:update')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event, VALID_PARAMS) as { success: boolean }
      expect(result.success).toBe(true)
      expect(mockOutputFiles.update).toHaveBeenCalledWith(
        VALID_PARAMS.type,
        VALID_PARAMS.id,
        { content: VALID_PARAMS.content, metadata: VALID_PARAMS.metadata }
      )
    })

    it('should return error when id is empty', async () => {
      const handler = getHandler('output:update')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_PARAMS, id: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error for invalid output type', async () => {
      const handler = getHandler('output:update')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_PARAMS, type: 'bad-type' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when content is not a string', async () => {
      const handler = getHandler('output:update')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_PARAMS, content: 123 }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when metadata is an array', async () => {
      const handler = getHandler('output:update')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { ...VALID_PARAMS, metadata: ['not', 'an', 'object'] }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // output:load-all
  // -------------------------------------------------------------------------

  describe('output:load-all handler', () => {
    it('should return all output files', async () => {
      const handler = getHandler('output:load-all')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(mockOutputFiles.loadAll).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // output:load-by-type
  // -------------------------------------------------------------------------

  describe('output:load-by-type handler', () => {
    it('should return files for a valid type', async () => {
      const handler = getHandler('output:load-by-type')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event, 'posts') as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(mockOutputFiles.loadByType).toHaveBeenCalledWith('posts')
    })

    it('should return error for invalid output type', async () => {
      const handler = getHandler('output:load-by-type')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, 'invalid') as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when type is an empty string', async () => {
      const handler = getHandler('output:load-by-type')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, '') as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // output:load-one
  // -------------------------------------------------------------------------

  describe('output:load-one handler', () => {
    it('should return a specific output file when found', async () => {
      const handler = getHandler('output:load-one')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event, { type: 'posts', id: '2024-01-15_120000' }) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toEqual(SAMPLE_OUTPUT_FILE)
      expect(mockOutputFiles.loadOne).toHaveBeenCalledWith('posts', '2024-01-15_120000')
    })

    it('should return null when file is not found', async () => {
      mockOutputFiles.loadOne.mockResolvedValue(null)
      const handler = getHandler('output:load-one')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event, { type: 'posts', id: 'nonexistent' }) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should return error when type is invalid', async () => {
      const handler = getHandler('output:load-one')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { type: 'unknown', id: 'abc' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when id is empty', async () => {
      const handler = getHandler('output:load-one')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { type: 'posts', id: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // output:delete
  // -------------------------------------------------------------------------

  describe('output:delete handler', () => {
    it('should call outputFiles.delete with the correct args', async () => {
      const handler = getHandler('output:delete')
      const { event } = makeMockEvent(mockOutputFiles)

      const result = await handler(event, { type: 'posts', id: '2024-01-15_120000' }) as { success: boolean }
      expect(result.success).toBe(true)
      expect(mockOutputFiles.delete).toHaveBeenCalledWith('posts', '2024-01-15_120000')
    })

    it('should return error when type is empty', async () => {
      const handler = getHandler('output:delete')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { type: '', id: '2024-01-15_120000' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error for invalid output type', async () => {
      const handler = getHandler('output:delete')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { type: 'notes', id: '2024-01-15_120000' }) as { success: boolean; error: { message: string } }
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Invalid output type')
    })

    it('should return error when id is empty', async () => {
      const handler = getHandler('output:delete')
      const { event } = makeMockEvent(mockOutputFiles)
      const result = await handler(event, { type: 'posts', id: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })
})
