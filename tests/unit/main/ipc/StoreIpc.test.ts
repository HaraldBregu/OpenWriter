/**
 * Tests for StoreIpc.
 * Verifies store/settings IPC handlers with validator integration.
 */
import { ipcMain } from 'electron'
import { StoreIpc } from '../../../../src/main/ipc/StoreIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('StoreIpc', () => {
  let module: StoreIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockStore: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockStore = {
      getModelSettings: jest.fn().mockReturnValue(null),
      getAllModelSettings: jest.fn().mockReturnValue({}),
      setSelectedModel: jest.fn(),
      setApiToken: jest.fn(),
      setModelSettings: jest.fn(),
      getCurrentWorkspace: jest.fn().mockReturnValue(null),
      setCurrentWorkspace: jest.fn(),
      getRecentWorkspaces: jest.fn().mockReturnValue([]),
      clearCurrentWorkspace: jest.fn()
    }

    container = new ServiceContainer()
    container.register('store', mockStore)
    eventBus = new EventBus()
    module = new StoreIpc()
  })

  it('should have name "store"', () => {
    expect(module.name).toBe('store')
  })

  it('should register 9 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(9)
  })

  it('should register all store channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('store-get-model-settings')
    expect(channels).toContain('store-get-all-model-settings')
    expect(channels).toContain('store-set-selected-model')
    expect(channels).toContain('store-set-api-token')
    expect(channels).toContain('store-set-model-settings')
    expect(channels).toContain('store-get-current-workspace')
    expect(channels).toContain('store-set-current-workspace')
    expect(channels).toContain('store-get-recent-workspaces')
    expect(channels).toContain('store-clear-current-workspace')
  })

  it('should call store.getAllModelSettings through wrapped handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'store-get-all-model-settings'
    )[1]
    const result = await handler({})
    expect(result.success).toBe(true)
    expect(mockStore.getAllModelSettings).toHaveBeenCalled()
  })
})
