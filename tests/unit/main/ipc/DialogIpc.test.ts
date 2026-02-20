/**
 * Tests for DialogIpc.
 * Verifies dialog IPC handler registrations with wrapSimpleHandler.
 */
import { ipcMain } from 'electron'
import { DialogIpc } from '../../../../src/main/ipc/DialogIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('DialogIpc', () => {
  let module: DialogIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockDialog: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockDialog = {
      showOpenDialog: jest.fn().mockResolvedValue({ type: 'open', data: {} }),
      showSaveDialog: jest.fn().mockResolvedValue({ type: 'save', data: {} }),
      showMessageBox: jest.fn().mockResolvedValue({ type: 'message', data: {} }),
      showErrorDialog: jest.fn().mockResolvedValue({ type: 'error', data: {} })
    }

    container = new ServiceContainer()
    container.register('dialog', mockDialog)
    eventBus = new EventBus()
    module = new DialogIpc()
  })

  it('should have name "dialog"', () => {
    expect(module.name).toBe('dialog')
  })

  it('should register 4 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(4)
  })

  it('should register all dialog channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('dialog-show-open')
    expect(channels).toContain('dialog-show-save')
    expect(channels).toContain('dialog-show-message')
    expect(channels).toContain('dialog-show-error')
  })

  it('should call showOpenDialog through wrapped handler', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'dialog-show-open'
    )[1]
    // wrapSimpleHandler wraps the function, so call with event
    const result = await handler({})
    expect(result.success).toBe(true)
    expect(mockDialog.showOpenDialog).toHaveBeenCalled()
  })

  it('should pass arguments to showMessageBox', async () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'dialog-show-message'
    )[1]
    await handler({}, 'msg', 'detail', ['OK', 'Cancel'])
    expect(mockDialog.showMessageBox).toHaveBeenCalledWith('msg', 'detail', ['OK', 'Cancel'])
  })
})
