/**
 * Tests for store/settings IPC handlers.
 * These handlers were previously in StoreIpc; they are now registered by
 * CustomIpc and exposed to the renderer via window.app instead of window.store.
 */
import { ipcMain } from 'electron'
import { CustomIpc } from '../../../../src/main/ipc/CustomIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// Mock dependencies required by CustomIpc
jest.mock('node:child_process', () => ({
  execFile: jest.fn((_cmd: unknown, _args: unknown, callback: (e: null, o: string, er: string) => void) => callback(null, '', ''))
}))

jest.mock('node:util', () => ({
  promisify: jest.fn((_fn: unknown) => {
    return jest.fn().mockResolvedValue('')
  })
}))

jest.mock('@electron-toolkit/utils', () => ({
  is: { dev: true }
}))

describe('Store handlers in CustomIpc (formerly StoreIpc)', () => {
  let module: CustomIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockStore: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockStore = {
      getAllProviderSettings: jest.fn().mockReturnValue({}),
      getProviderSettings: jest.fn().mockReturnValue(null),
      setProviderSettings: jest.fn(),
      setInferenceDefaults: jest.fn(),
      getModelSettings: jest.fn().mockReturnValue(null),
      getAllModelSettings: jest.fn().mockReturnValue({}),
      setSelectedModel: jest.fn(),
      setApiToken: jest.fn(),
      setModelSettings: jest.fn(),
    }

    container = new ServiceContainer()
    container.register('store', mockStore)
    eventBus = new EventBus()
    module = new CustomIpc()
  })

  it('should register store channel handlers via ipcMain.handle', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('store-get-all-provider-settings')
    expect(channels).toContain('store-get-provider-settings')
    expect(channels).toContain('store-set-provider-settings')
    expect(channels).toContain('store-set-inference-defaults')
    expect(channels).toContain('store-get-model-settings')
    expect(channels).toContain('store-get-all-model-settings')
    expect(channels).toContain('store-set-selected-model')
    expect(channels).toContain('store-set-api-token')
    expect(channels).toContain('store-set-model-settings')
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

  it('should call store.getAllProviderSettings through wrapped handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'store-get-all-provider-settings'
    )[1]
    const result = await handler({})
    expect(result.success).toBe(true)
    expect(mockStore.getAllProviderSettings).toHaveBeenCalled()
  })
})
