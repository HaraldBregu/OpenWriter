/**
 * Tests for DirectoriesIpc.
 * Verifies directory management IPC handler registrations and that each handler
 * delegates to the correct WorkspaceMetadataService method.
 */
import { ipcMain } from 'electron'
import { DirectoriesIpc } from '../../../../src/main/ipc/DirectoriesIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('DirectoriesIpc', () => {
  let module: DirectoriesIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockMetadata: Record<string, jest.Mock>

  // All channels registered by DirectoriesIpc
  const EXPECTED_CHANNELS = [
    'directories:list',
    'directories:add',
    'directories:add-many',
    'directories:remove',
    'directories:validate',
    'directories:mark-indexed'
  ]

  // A reusable mock IPC event wired through the windowContextManager chain.
  // BrowserWindow.fromWebContents returns the shared mock with id=1, so
  // windowContextManager.get(1) → mockWindowContext → getService() → mockMetadata.
  let mockEvent: { sender: { id: number } }

  beforeEach(() => {
    jest.clearAllMocks()

    mockMetadata = {
      getDirectories: jest.fn().mockResolvedValue([]),
      addDirectory: jest.fn().mockResolvedValue({ id: 'dir-1', path: '/some/path' }),
      addDirectories: jest.fn().mockResolvedValue([{ id: 'dir-1', path: '/some/path' }]),
      removeDirectory: jest.fn().mockResolvedValue(undefined),
      validateDirectory: jest.fn().mockResolvedValue({ valid: true }),
      markDirectoryIndexed: jest.fn().mockResolvedValue(undefined)
    }

    const mockWindowContext = {
      getService: jest.fn().mockReturnValue(mockMetadata)
    }

    const mockWindowContextManager = {
      get: jest.fn().mockReturnValue(mockWindowContext)
    }

    container = new ServiceContainer()
    container.register('workspaceMetadata', mockMetadata)
    container.register('windowContextManager', mockWindowContextManager)

    eventBus = new EventBus()
    module = new DirectoriesIpc()

    mockEvent = { sender: { id: 1 } }
  })

  it('should have name "directories"', () => {
    expect(module.name).toBe('directories')
  })

  it(`should register ${EXPECTED_CHANNELS.length} ipcMain handlers`, () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(EXPECTED_CHANNELS.length)
  })

  it('should register all directories channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    for (const channel of EXPECTED_CHANNELS) {
      expect(channels).toContain(channel)
    }
  })

  it('should call getDirectories via the directories:list handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:list'
    )?.[1]
    expect(handler).toBeDefined()

    const result = await handler(mockEvent)

    expect(result.success).toBe(true)
    expect(mockMetadata.getDirectories).toHaveBeenCalledTimes(1)
  })

  it('should call addDirectory with the provided path via the directories:add handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:add'
    )?.[1]
    expect(handler).toBeDefined()

    const result = await handler(mockEvent, '/new/directory')

    expect(result.success).toBe(true)
    expect(mockMetadata.addDirectory).toHaveBeenCalledWith('/new/directory')
  })

  it('should call addDirectories with the provided paths via the directories:add-many handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:add-many'
    )?.[1]
    expect(handler).toBeDefined()

    const paths = ['/path/one', '/path/two']
    const result = await handler(mockEvent, paths)

    expect(result.success).toBe(true)
    expect(mockMetadata.addDirectories).toHaveBeenCalledWith(paths)
  })

  it('should call removeDirectory with the provided id via the directories:remove handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:remove'
    )?.[1]
    expect(handler).toBeDefined()

    const result = await handler(mockEvent, 'dir-id-42')

    expect(result.success).toBe(true)
    expect(mockMetadata.removeDirectory).toHaveBeenCalledWith('dir-id-42')
  })

  it('should call validateDirectory with the provided path via the directories:validate handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:validate'
    )?.[1]
    expect(handler).toBeDefined()

    const result = await handler(mockEvent, '/validate/me')

    expect(result.success).toBe(true)
    expect(mockMetadata.validateDirectory).toHaveBeenCalledWith('/validate/me')
  })

  it('should call markDirectoryIndexed with id and flag via the directories:mark-indexed handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:mark-indexed'
    )?.[1]
    expect(handler).toBeDefined()

    const result = await handler(mockEvent, 'dir-id-99', true)

    expect(result.success).toBe(true)
    expect(mockMetadata.markDirectoryIndexed).toHaveBeenCalledWith('dir-id-99', true)
  })

  it('should return success:false when a service method throws', async () => {
    mockMetadata.getDirectories.mockRejectedValueOnce(new Error('Service failure'))

    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'directories:list'
    )?.[1]
    expect(handler).toBeDefined()

    const result = await handler(mockEvent)

    expect(result.success).toBe(false)
    expect((result as { success: false; error: { message: string } }).error.message).toBe('Service failure')
  })
})
