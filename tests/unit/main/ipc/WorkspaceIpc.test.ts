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
  let mockStore: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockStore = {
      setCurrentWorkspace: jest.fn(),
      getRecentWorkspaces: jest.fn().mockReturnValue([]),
      clearCurrentWorkspace: jest.fn()
    }

    container = new ServiceContainer()
    container.register('store', mockStore)
    eventBus = new EventBus()
    module = new WorkspaceIpc()
  })

  it('should have name "workspace"', () => {
    expect(module.name).toBe('workspace')
  })

  it('should register 6 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(6)
  })

  it('should register all workspace channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('workspace:select-folder')
    expect(channels).toContain('workspace-get-current')
    expect(channels).toContain('workspace-set-current')
    expect(channels).toContain('workspace-get-recent')
    expect(channels).toContain('workspace-clear')
    expect(channels).toContain('workspace-directory-exists')
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

  it('should set current workspace and persist to store', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace-set-current'
    )?.[1]
    expect(handler).toBeDefined()
    await handler({}, '/new/workspace')
    expect(mockStore.setCurrentWorkspace).toHaveBeenCalledWith('/new/workspace')
  })

  it('should clear workspace state', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'workspace-clear'
    )?.[1]
    expect(handler).toBeDefined()
    await handler({})
    expect(mockStore.clearCurrentWorkspace).toHaveBeenCalled()
  })
})
