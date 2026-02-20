/**
 * Tests for ClipboardIpc.
 * Verifies all clipboard IPC handler registrations.
 */
import { ipcMain } from 'electron'
import { ClipboardIpc } from '../../../../src/main/ipc/ClipboardIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('ClipboardIpc', () => {
  let module: ClipboardIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockClipboard: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockClipboard = {
      writeText: jest.fn(),
      readText: jest.fn().mockReturnValue('text'),
      writeHTML: jest.fn(),
      readHTML: jest.fn().mockReturnValue('<p>hi</p>'),
      writeImage: jest.fn(),
      readImage: jest.fn().mockReturnValue(null),
      clear: jest.fn(),
      getContent: jest.fn().mockReturnValue(null),
      getAvailableFormats: jest.fn().mockReturnValue([]),
      hasText: jest.fn().mockReturnValue(false),
      hasImage: jest.fn().mockReturnValue(false),
      hasHTML: jest.fn().mockReturnValue(false)
    }

    container = new ServiceContainer()
    container.register('clipboard', mockClipboard)
    eventBus = new EventBus()
    module = new ClipboardIpc()
  })

  it('should have name "clipboard"', () => {
    expect(module.name).toBe('clipboard')
  })

  it('should register 12 ipcMain handlers', () => {
    module.register(container, eventBus)
    const handleCalls = (ipcMain.handle as jest.Mock).mock.calls
    expect(handleCalls.length).toBe(12)
  })

  it('should register all clipboard channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('clipboard-write-text')
    expect(channels).toContain('clipboard-read-text')
    expect(channels).toContain('clipboard-write-html')
    expect(channels).toContain('clipboard-read-html')
    expect(channels).toContain('clipboard-write-image')
    expect(channels).toContain('clipboard-read-image')
    expect(channels).toContain('clipboard-clear')
    expect(channels).toContain('clipboard-get-content')
    expect(channels).toContain('clipboard-get-formats')
    expect(channels).toContain('clipboard-has-text')
    expect(channels).toContain('clipboard-has-image')
    expect(channels).toContain('clipboard-has-html')
  })

  it('should delegate clipboard-write-text to service', () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'clipboard-write-text'
    )[1]
    handler({}, 'hello')
    expect(mockClipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('should delegate clipboard-read-text to service', () => {
    module.register(container, eventBus)
    const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'clipboard-read-text'
    )[1]
    const result = handler()
    expect(result).toBe('text')
  })
})
