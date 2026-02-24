/**
 * Tests for PersonalityIpc.
 *
 * Strategy:
 *   - Verify module name, handler count (6), and all channel names.
 *   - Exercise each handler's happy path: service method is called and
 *     the handler returns success:true with the expected data.
 *   - Validate the input-validation guards on every channel that checks
 *     sectionId, content, id, and update shape — each guard should
 *     produce success:false via wrapIpcHandler.
 */
import { ipcMain } from 'electron'
import { PersonalityIpc } from '../../../../src/main/ipc/PersonalityIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockEvent(mockService: unknown) {
  const mockWindowContext = { getService: jest.fn().mockReturnValue(mockService) }
  const mockWindowContextManager = { get: jest.fn().mockReturnValue(mockWindowContext) }
  return {
    event: { sender: { id: 1 } } as unknown as Electron.IpcMainInvokeEvent,
    mockWindowContextManager,
  }
}

function getHandler(channel: string) {
  const entry = (ipcMain.handle as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === channel)
  if (!entry) throw new Error(`Handler for channel "${channel}" not registered`)
  return entry[1] as (...args: unknown[]) => Promise<unknown>
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PersonalityIpc', () => {
  const EXPECTED_CHANNELS = [
    'personality:save',
    'personality:load-all',
    'personality:load-one',
    'personality:delete',
    'personality:load-section-config',
    'personality:save-section-config',
  ]

  let module: PersonalityIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockPersonalityFiles: Record<string, jest.Mock>

  const SAMPLE_SAVE_RESULT = {
    id: '2024-03-10_090000',
    path: '/ws/personality/consciousness/2024-03-10_090000',
    savedAt: 1710064800000,
  }

  const SAMPLE_FILE = {
    id: '2024-03-10_090000',
    sectionId: 'consciousness',
    path: '/ws/personality/consciousness/2024-03-10_090000',
    metadata: { title: 'Consciousness', provider: 'openai', model: 'gpt-4o' },
    content: '## Consciousness thoughts',
    savedAt: 1710064800000,
  }

  const SAMPLE_SECTION_CONFIG = {
    schemaVersion: 1,
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    reasoning: false,
    createdAt: '2024-03-10T09:00:00.000Z',
    updatedAt: '2024-03-10T09:00:00.000Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockPersonalityFiles = {
      save: jest.fn().mockResolvedValue(SAMPLE_SAVE_RESULT),
      loadAll: jest.fn().mockResolvedValue([SAMPLE_FILE]),
      loadOne: jest.fn().mockResolvedValue(SAMPLE_FILE),
      delete: jest.fn().mockResolvedValue(undefined),
      loadSectionConfig: jest.fn().mockResolvedValue(SAMPLE_SECTION_CONFIG),
      saveSectionConfig: jest.fn().mockResolvedValue(SAMPLE_SECTION_CONFIG),
    }

    const { mockWindowContextManager } = makeMockEvent(mockPersonalityFiles)
    container = new ServiceContainer()
    container.register('windowContextManager', mockWindowContextManager)

    eventBus = new EventBus()
    module = new PersonalityIpc()
    module.register(container, eventBus)
  })

  // -------------------------------------------------------------------------
  // Module metadata
  // -------------------------------------------------------------------------

  it('should have name "personality"', () => {
    expect(module.name).toBe('personality')
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
  // personality:save
  // -------------------------------------------------------------------------

  describe('personality:save handler', () => {
    const VALID_INPUT = { sectionId: 'consciousness', content: '## Reflections', metadata: { title: 'Reflection' } }

    it('should call personalityFiles.save and return the result', async () => {
      const handler = getHandler('personality:save')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, VALID_INPUT) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toEqual(SAMPLE_SAVE_RESULT)
      expect(mockPersonalityFiles.save).toHaveBeenCalledWith(VALID_INPUT)
    })

    it('should return error when sectionId is empty', async () => {
      const handler = getHandler('personality:save')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_INPUT, sectionId: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when sectionId is not a string', async () => {
      const handler = getHandler('personality:save')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_INPUT, sectionId: null }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when content is empty', async () => {
      const handler = getHandler('personality:save')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_INPUT, content: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when content is not a string', async () => {
      const handler = getHandler('personality:save')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_INPUT, content: 123 }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // personality:load-all
  // -------------------------------------------------------------------------

  describe('personality:load-all handler', () => {
    it('should return all personality files', async () => {
      const handler = getHandler('personality:load-all')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(mockPersonalityFiles.loadAll).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // personality:load-one
  // -------------------------------------------------------------------------

  describe('personality:load-one handler', () => {
    const VALID_PARAMS = { sectionId: 'consciousness', id: '2024-03-10_090000' }

    it('should return the requested personality file', async () => {
      const handler = getHandler('personality:load-one')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, VALID_PARAMS) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toEqual(SAMPLE_FILE)
      expect(mockPersonalityFiles.loadOne).toHaveBeenCalledWith(
        VALID_PARAMS.sectionId,
        VALID_PARAMS.id
      )
    })

    it('should return null when file is not found', async () => {
      mockPersonalityFiles.loadOne.mockResolvedValue(null)
      const handler = getHandler('personality:load-one')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, VALID_PARAMS) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should return error when sectionId is empty', async () => {
      const handler = getHandler('personality:load-one')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_PARAMS, sectionId: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when id is empty', async () => {
      const handler = getHandler('personality:load-one')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_PARAMS, id: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // personality:delete
  // -------------------------------------------------------------------------

  describe('personality:delete handler', () => {
    const VALID_PARAMS = { sectionId: 'consciousness', id: '2024-03-10_090000' }

    it('should call personalityFiles.delete with sectionId and id', async () => {
      const handler = getHandler('personality:delete')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, VALID_PARAMS) as { success: boolean }
      expect(result.success).toBe(true)
      expect(mockPersonalityFiles.delete).toHaveBeenCalledWith(
        VALID_PARAMS.sectionId,
        VALID_PARAMS.id
      )
    })

    it('should return error when sectionId is empty', async () => {
      const handler = getHandler('personality:delete')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_PARAMS, sectionId: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when id is empty', async () => {
      const handler = getHandler('personality:delete')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { ...VALID_PARAMS, id: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // personality:load-section-config
  // -------------------------------------------------------------------------

  describe('personality:load-section-config handler', () => {
    it('should return section config when found', async () => {
      const handler = getHandler('personality:load-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, { sectionId: 'consciousness' }) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toEqual(SAMPLE_SECTION_CONFIG)
      expect(mockPersonalityFiles.loadSectionConfig).toHaveBeenCalledWith('consciousness')
    })

    it('should return null when no section config exists', async () => {
      mockPersonalityFiles.loadSectionConfig.mockResolvedValue(null)
      const handler = getHandler('personality:load-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, { sectionId: 'motivation' }) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should return error when sectionId is empty', async () => {
      const handler = getHandler('personality:load-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { sectionId: '' }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // personality:save-section-config
  // -------------------------------------------------------------------------

  describe('personality:save-section-config handler', () => {
    const VALID_UPDATE = { provider: 'anthropic', model: 'claude-3-sonnet', temperature: 0.5 }

    it('should call saveSectionConfig and return the updated config', async () => {
      const handler = getHandler('personality:save-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)

      const result = await handler(event, { sectionId: 'consciousness', update: VALID_UPDATE }) as { success: boolean; data: unknown }
      expect(result.success).toBe(true)
      expect(result.data).toEqual(SAMPLE_SECTION_CONFIG)
      expect(mockPersonalityFiles.saveSectionConfig).toHaveBeenCalledWith('consciousness', VALID_UPDATE)
    })

    it('should return error when sectionId is empty', async () => {
      const handler = getHandler('personality:save-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { sectionId: '', update: VALID_UPDATE }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when update is an array instead of object', async () => {
      const handler = getHandler('personality:save-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { sectionId: 'consciousness', update: ['not', 'object'] }) as { success: boolean }
      expect(result.success).toBe(false)
    })

    it('should return error when update is null', async () => {
      const handler = getHandler('personality:save-section-config')
      const { event } = makeMockEvent(mockPersonalityFiles)
      const result = await handler(event, { sectionId: 'consciousness', update: null }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })
})
