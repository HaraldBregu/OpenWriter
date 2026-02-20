/**
 * Tests for CustomIpc.
 * Verifies sound playback and context menu IPC handlers.
 */
import { ipcMain } from 'electron'
import { CustomIpc } from '../../../../src/main/ipc/CustomIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// Mock child_process and @electron-toolkit/utils
jest.mock('node:child_process', () => ({
  execFile: jest.fn((_cmd, _args, callback) => callback(null, '', ''))
}))

jest.mock('node:util', () => ({
  promisify: jest.fn((fn) => {
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
    eventBus = new EventBus()
    module = new CustomIpc()
  })

  it('should have name "custom"', () => {
    expect(module.name).toBe('custom')
  })

  it('should register 3 ipcMain.on handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.on as jest.Mock).mock.calls).toHaveLength(3)
  })

  it('should register play-sound, context-menu, and context-menu-editable channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.on as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('play-sound')
    expect(channels).toContain('context-menu')
    expect(channels).toContain('context-menu-editable')
  })
})
