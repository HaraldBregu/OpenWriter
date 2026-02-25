/**
 * Tests for WorkspaceIpc.
 * Verifies workspace management IPC handlers.
 */
import { ipcMain, dialog } from 'electron'
import { WorkspaceIpc } from '../../../../src/main/ipc/WorkspaceIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('WorkspaceIpc', () => {
  let module: WorkspaceIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockWorkspace: Record<string, jest.Mock>

  // All expected IPC channels registered by WorkspaceIpc
  const EXPECTED_CHANNELS = [
    'workspace:select-folder',
    'workspace-get-current',
    'workspace-set-current',
    'workspace-get-recent',
    'workspace-clear',
    'workspace-directory-exists',
    'workspace-remove-recent'
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockWorkspace = {
      getCurrent: jest.fn().mockReturnValue(null),
      setCurrent: jest.fn(),
      getRecent: jest.fn().mockReturnValue([]),
      clear: jest.fn(),
      removeRecent: jest.fn()
    }

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }

    // WindowContext returned by windowContextManager.get(windowId)
    const mockWindowContext = {
      getService: jest.fn().mockReturnValue(mockWorkspace)
    }

    // WindowContextManager registered in ServiceContainer
    const mockWindowContextManager = {
      get: jest.fn().mockReturnValue(mockWindowContext)
    }

    container = new ServiceContainer()
    container.register('workspace', mockWorkspace)
    container.register('logger', mockLogger)
    container.register('windowContextManager', mockWindowContextManager)

    eventBus = new EventBus()
    module = new WorkspaceIpc()
  })

  it('should have name "workspace"', () => {
    expect(module.name).toBe('workspace')
  })

  it(`should register ${EXPECTED_CHANNELS.length} ipcMain handlers`, () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(EXPECTED_CHANNELS.length)
  })

  it('should register all workspace channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    for (const channel of EXPECTED_CHANNELS) {
      expect(channels).toContain(channel)
    }
  })

  it('should return selected folder path from select-folder handler', async () => {
    ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      filePaths: ['/path/to/workspace']
    })

    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace:select-folder'
    )?.[1]
    expect(handler).toBeDefined()
    const result = await handler({})
    expect(result.success).toBe(true)
    expect(result.data).toBe('/path/to/workspace')
  })

  it('should return null when folder selection is canceled', async () => {
    ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      filePaths: []
    })

    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace:select-folder'
    )?.[1]
    expect(handler).toBeDefined()
    const result = await handler({})
    expect(result.data).toBeNull()
  })

  it('should set current workspace via workspace service', async () => {
    // BrowserWindow.fromWebContents returns a window with id=1 (from the mock)
    const mockEvent = { sender: { id: 1 } }

    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace-set-current'
    )?.[1]
    expect(handler).toBeDefined()
    await handler(mockEvent, '/new/workspace')
    expect(mockWorkspace.setCurrent).toHaveBeenCalledWith('/new/workspace')
  })

  it('should clear workspace state via workspace service', async () => {
    const mockEvent = { sender: { id: 1 } }

    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace-clear'
    )?.[1]
    expect(handler).toBeDefined()
    await handler(mockEvent)
    expect(mockWorkspace.clear).toHaveBeenCalled()
  })

  it('should remove a recent workspace via workspace service', async () => {
    const mockEvent = { sender: { id: 1 } }

    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace-remove-recent'
    )?.[1]
    expect(handler).toBeDefined()
    await handler(mockEvent, '/path/to/remove')
    expect(mockWorkspace.removeRecent).toHaveBeenCalledWith('/path/to/remove')
  })

  it('should check directory existence via workspace-directory-exists handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace-directory-exists'
    )?.[1]
    expect(handler).toBeDefined()

    // Non-existent path returns false
    const result = await handler({}, '/nonexistent/path/that/does/not/exist')
    expect(result.success).toBe(true)
    expect(result.data).toBe(false)
  })
})
