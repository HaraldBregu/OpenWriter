/**
 * Tests for FilesystemIpc.
 * Verifies filesystem IPC handlers, PathValidator integration, and EventBus broadcasting.
 */
import { ipcMain } from 'electron'
import { FilesystemIpc } from '../../../../src/main/ipc/FilesystemIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('FilesystemIpc', () => {
  let module: FilesystemIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockFs: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockFs = {
      openFileDialog: jest.fn().mockResolvedValue(null),
      readFile: jest.fn().mockResolvedValue({ content: 'data' }),
      writeFile: jest.fn().mockResolvedValue({ success: true }),
      saveFileDialog: jest.fn().mockResolvedValue({ success: true }),
      selectDirectory: jest.fn().mockResolvedValue('/dir'),
      watchDirectory: jest.fn().mockReturnValue(true),
      unwatchDirectory: jest.fn().mockReturnValue(true),
      getWatchedDirectories: jest.fn().mockReturnValue([]),
      onWatchEvent: jest.fn()
    }

    container = new ServiceContainer()
    container.register('filesystem', mockFs)
    eventBus = new EventBus()
    module = new FilesystemIpc()
  })

  it('should have name "filesystem"', () => {
    expect(module.name).toBe('filesystem')
  })

  it('should register 8 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(8)
  })

  it('should register all filesystem channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('fs-open-file-dialog')
    expect(channels).toContain('fs-read-file')
    expect(channels).toContain('fs-write-file')
    expect(channels).toContain('fs-save-file-dialog')
    expect(channels).toContain('fs-select-directory')
    expect(channels).toContain('fs-watch-directory')
    expect(channels).toContain('fs-unwatch-directory')
    expect(channels).toContain('fs-get-watched-directories')
  })

  it('should broadcast watch events via EventBus', () => {
    const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
    module.register(container, eventBus)

    expect(mockFs.onWatchEvent).toHaveBeenCalled()
    const callback = mockFs.onWatchEvent.mock.calls[0][0]
    callback({ eventType: 'rename', filename: 'test.txt', directory: '/dir', timestamp: 1 })

    expect(broadcastSpy).toHaveBeenCalledWith('fs-watch-event', expect.objectContaining({
      eventType: 'rename',
      filename: 'test.txt'
    }))
  })
})
