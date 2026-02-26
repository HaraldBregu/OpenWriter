/**
 * Tests for WindowIpc.
 * Verifies window management IPC handlers and control operations.
 */
import { ipcMain } from 'electron'
import { WindowIpc } from '../../../../src/main/ipc/WindowIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('WindowIpc', () => {
  let module: WindowIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockWindowManager: Record<string, jest.Mock>
  let mockAppState: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockWindowManager = {
      createChildWindow: jest.fn().mockReturnValue({ id: 1, type: 'child' }),
      createModalWindow: jest.fn().mockReturnValue({ id: 2, type: 'modal' }),
      createFramelessWindow: jest.fn().mockReturnValue({ id: 3, type: 'frameless' }),
      createWidgetWindow: jest.fn().mockReturnValue({ id: 4, type: 'widget' }),
      closeWindow: jest.fn().mockReturnValue(true),
      closeAllManaged: jest.fn(),
      getState: jest.fn().mockReturnValue({ windows: [] }),
      onStateChange: jest.fn().mockReturnValue(() => {})
    }

    mockAppState = {
      setQuitting: jest.fn()
    }

    container = new ServiceContainer()
    container.register('windowManager', mockWindowManager)
    container.register('appState', mockAppState)
    eventBus = new EventBus()
    module = new WindowIpc()
  })

  it('should have name "window"', () => {
    expect(module.name).toBe('window')
  })

  it('should register ipcMain.handle calls for window creation and management', () => {
    module.register(container, eventBus)
    const handleCalls = (ipcMain.handle as jest.Mock).mock.calls
    const channels = handleCalls.map((c: unknown[]) => c[0])

    // 7 handle calls for window management + window:is-maximized + window:is-fullscreen + window:get-platform
    expect(channels).toContain('wm-create-child')
    expect(channels).toContain('wm-create-modal')
    expect(channels).toContain('wm-create-frameless')
    expect(channels).toContain('wm-create-widget')
    expect(channels).toContain('wm-close-window')
    expect(channels).toContain('wm-close-all')
    expect(channels).toContain('wm-get-state')
    expect(channels).toContain('window:is-maximized')
    expect(channels).toContain('window:is-fullscreen')
    expect(channels).toContain('window:get-platform')
  })

  it('should register ipcMain.on calls for window controls', () => {
    module.register(container, eventBus)
    const onCalls = (ipcMain.on as jest.Mock).mock.calls
    const channels = onCalls.map((c: unknown[]) => c[0])
    expect(channels).toContain('window:minimize')
    expect(channels).toContain('window:maximize')
    expect(channels).toContain('window:close')
    expect(channels).toContain('window:popup-menu')
  })

  it('should broadcast window state changes via EventBus', () => {
    const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
    module.register(container, eventBus)

    expect(mockWindowManager.onStateChange).toHaveBeenCalled()
    const callback = mockWindowManager.onStateChange.mock.calls[0][0]
    callback({ windows: [{ id: 1, type: 'child' }] })

    expect(broadcastSpy).toHaveBeenCalledWith('window-state-change', expect.objectContaining({
      windows: expect.any(Array)
    }))
  })
})
