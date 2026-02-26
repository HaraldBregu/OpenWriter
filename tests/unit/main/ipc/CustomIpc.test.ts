/**
 * Tests for CustomIpc.
 * Verifies sound playback, context menu IPC handlers, and the store/settings
 * handlers that were merged in from the former StoreIpc module.
 */
import { ipcMain } from 'electron'
import { CustomIpc } from '../../../../src/main/ipc/CustomIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// Mock child_process and @electron-toolkit/utils
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

describe('CustomIpc', () => {
  let module: CustomIpc
  let container: ServiceContainer
  let eventBus: EventBus

  beforeEach(() => {
    jest.clearAllMocks()
    container = new ServiceContainer()
    // CustomIpc now also registers store handlers and requires the store service
    container.register('store', {
      getAllProviderSettings: jest.fn().mockReturnValue({}),
      getProviderSettings: jest.fn().mockReturnValue(null),
      setProviderSettings: jest.fn(),
      setInferenceDefaults: jest.fn(),
      getModelSettings: jest.fn().mockReturnValue(null),
      getAllModelSettings: jest.fn().mockReturnValue({}),
      setSelectedModel: jest.fn(),
      setApiToken: jest.fn(),
      setModelSettings: jest.fn(),
    })
    eventBus = new EventBus()
    module = new CustomIpc()
  })

  it('should have name "custom"', () => {
    expect(module.name).toBe('custom')
  })

  it('should register 3 ipcMain.on handlers (sound + 2 context menus)', () => {
    module.register(container, eventBus)
    expect((ipcMain.on as jest.Mock).mock.calls).toHaveLength(3)
  })

  it('should register play-sound, context-menu, and context-menu-editable on channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.on as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('play-sound')
    expect(channels).toContain('context-menu')
    expect(channels).toContain('context-menu-editable')
  })

  it('should register 10 ipcMain.handle handlers (writing context menu + 9 store channels)', () => {
    module.register(container, eventBus)
    // 1 writing context menu + 9 store/settings channels
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(10)
  })

  it('should register writing context menu and all store channels via handle', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('context-menu:writing')
    expect(channels).toContain('store-get-all-provider-settings')
    expect(channels).toContain('store-get-provider-settings')
    expect(channels).toContain('store-set-provider-settings')
    expect(channels).toContain('store-set-inference-defaults')
    expect(channels).toContain('store-get-all-model-settings')
    expect(channels).toContain('store-get-model-settings')
    expect(channels).toContain('store-set-selected-model')
    expect(channels).toContain('store-set-api-token')
    expect(channels).toContain('store-set-model-settings')
  })
})
