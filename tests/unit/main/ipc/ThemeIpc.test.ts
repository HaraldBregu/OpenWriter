/**
 * Tests for ThemeIpc.
 *
 * Strategy:
 *   - ThemeIpc registers a single ipcMain.on listener for 'set-theme'
 *     (not ipcMain.handle), so we assert against ipcMain.on calls.
 *   - We extract the listener from the mock call list and invoke it
 *     directly to exercise the handler logic.
 *   - Tests cover:
 *     - Module name is 'theme'.
 *     - Exactly one ipcMain.on listener is registered ('set-theme').
 *     - Valid themes ('light', 'dark', 'system') update nativeTheme.themeSource.
 *     - Valid themes emit 'theme:changed' on the EventBus.
 *     - Valid themes broadcast 'change-theme' to sibling windows.
 *     - Invalid themes are silently ignored (no side effects).
 *     - Duplicate theme events are deduplicated (no re-broadcast on same value).
 *     - The sender window is excluded from the broadcast.
 */
import { ipcMain, BrowserWindow, nativeTheme, mockBrowserWindowInstance } from 'electron'
import { ThemeIpc } from '../../../../src/main/ipc/ThemeIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the registered 'set-theme' on-listener. */
function getListener(): (event: unknown, theme: string) => void {
  const entry = (ipcMain.on as jest.Mock).mock.calls.find(
    (c: unknown[]) => c[0] === 'set-theme'
  )
  if (!entry) throw new Error('Listener for "set-theme" was not registered')
  return entry[1] as (event: unknown, theme: string) => void
}

// A fake sender that is distinct from the mocked BrowserWindow instance
const FAKE_SENDER_CONTENTS = { id: 999 }
const MOCK_EVENT = { sender: FAKE_SENDER_CONTENTS }

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ThemeIpc', () => {
  let module: ThemeIpc
  let container: ServiceContainer
  let eventBus: EventBus

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the nativeTheme source
    ;(nativeTheme as { themeSource: string }).themeSource = 'system'

    container = new ServiceContainer()
    eventBus = new EventBus()
    module = new ThemeIpc()
    module.register(container, eventBus)
  })

  // -------------------------------------------------------------------------
  // Module metadata and registration
  // -------------------------------------------------------------------------

  it('should have name "theme"', () => {
    expect(module.name).toBe('theme')
  })

  it('should register exactly one ipcMain.on listener', () => {
    expect((ipcMain.on as jest.Mock).mock.calls).toHaveLength(1)
  })

  it('should register a listener on channel "set-theme"', () => {
    const channels = (ipcMain.on as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('set-theme')
  })

  it('should not register any ipcMain.handle handlers', () => {
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Valid theme handling
  // -------------------------------------------------------------------------

  describe('valid themes', () => {
    it.each(['light', 'dark', 'system'] as const)(
      'should update nativeTheme.themeSource to "%s"',
      (theme) => {
        // Use a fresh ThemeIpc per test to reset lastTheme dedup state
        const freshModule = new ThemeIpc()
        const freshEventBus = new EventBus()
        const freshContainer = new ServiceContainer()

        jest.clearAllMocks()
        freshModule.register(freshContainer, freshEventBus)

        const listener = getListener()
        listener(MOCK_EVENT, theme)

        expect(nativeTheme.themeSource).toBe(theme)
      }
    )

    it.each(['light', 'dark', 'system'] as const)(
      'should emit theme:changed on EventBus for theme "%s"',
      (theme) => {
        const freshModule = new ThemeIpc()
        const freshEventBus = new EventBus()
        const freshContainer = new ServiceContainer()

        jest.clearAllMocks()
        freshModule.register(freshContainer, freshEventBus)

        const themeChangedSpy = jest.fn()
        freshEventBus.on('theme:changed', themeChangedSpy)

        const listener = getListener()
        listener(MOCK_EVENT, theme)

        expect(themeChangedSpy).toHaveBeenCalledWith(
          expect.objectContaining({ payload: { theme } })
        )
      }
    )

    it('should broadcast "change-theme" to all windows except the sender', () => {
      // The mock BrowserWindow instance has a webContents that is distinct
      // from FAKE_SENDER_CONTENTS (id=999), so it should receive the broadcast.
      const listener = getListener()
      listener(MOCK_EVENT, 'dark')

      expect(BrowserWindow.getAllWindows).toHaveBeenCalled()
      // The mock window's webContents.send should be called with the new theme
      expect(mockBrowserWindowInstance.webContents.send).toHaveBeenCalledWith('change-theme', 'dark')
    })

    it('should not broadcast "change-theme" to the sender window', () => {
      // Make the sender's webContents be the same object as the mock window's
      const senderEvent = { sender: mockBrowserWindowInstance.webContents }

      const listener = getListener()
      listener(senderEvent, 'light')

      // The send should NOT be called because sender is the same as the window
      expect(mockBrowserWindowInstance.webContents.send).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Invalid theme handling
  // -------------------------------------------------------------------------

  describe('invalid themes', () => {
    it.each(['auto', 'HIGH_CONTRAST', '', '  ', 'LIGHT'])(
      'should ignore invalid theme value "%s"',
      (invalidTheme) => {
        const listener = getListener()
        listener(MOCK_EVENT, invalidTheme)

        // nativeTheme should remain unchanged (still 'system' from beforeEach reset)
        expect(nativeTheme.themeSource).toBe('system')
        // No broadcast should occur
        expect(mockBrowserWindowInstance.webContents.send).not.toHaveBeenCalled()
      }
    )
  })

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  describe('deduplication', () => {
    it('should not broadcast when the same theme is sent twice in a row', () => {
      const listener = getListener()

      listener(MOCK_EVENT, 'dark')
      // Reset the send spy count
      ;(mockBrowserWindowInstance.webContents.send as jest.Mock).mockClear()

      // Second call with the same theme — should be de-duplicated
      listener(MOCK_EVENT, 'dark')

      expect(mockBrowserWindowInstance.webContents.send).not.toHaveBeenCalled()
    })

    it('should broadcast again when theme changes to a different value', () => {
      const listener = getListener()

      listener(MOCK_EVENT, 'dark')
      ;(mockBrowserWindowInstance.webContents.send as jest.Mock).mockClear()

      // Different theme — should go through
      listener(MOCK_EVENT, 'light')

      expect(mockBrowserWindowInstance.webContents.send).toHaveBeenCalledWith('change-theme', 'light')
    })
  })
})
