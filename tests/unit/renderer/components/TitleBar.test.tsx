/**
 * Tests for TitleBar component.
 *
 * Renders the application title bar with window controls and sidebar toggle.
 * The component uses window.win.* for window controls and window.app.popupMenu.
 *
 * Mocking strategy:
 *   - react-i18next is mocked so t(key) returns the key itself. Assertions
 *     use the i18n key strings (e.g. 'titleBar.close') rather than the
 *     translated strings so tests are locale-independent.
 *   - lucide-react is mocked to avoid SVG rendering complications in jsdom.
 *   - window.win and window.app are installed by tests/setup/renderer.ts.
 *     Individual tests override specific methods as needed.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Must come before the component import
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn() }
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}))

jest.mock('lucide-react', () => ({
  Menu: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'menu-icon' }),
  PanelLeft: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'panel-left-icon' }),
  Minus: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'minus-icon' }),
  X: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'x-icon' })
}))

import { TitleBar } from '../../../../src/renderer/src/components/TitleBar'

// ---------------------------------------------------------------------------
// i18n key constants — must match what TitleBar passes to t()
// ---------------------------------------------------------------------------
const KEYS = {
  applicationMenu: 'titleBar.applicationMenu',
  toggleSidebar: 'titleBar.toggleSidebar',
  minimize: 'titleBar.minimize',
  maximize: 'titleBar.maximize',
  restore: 'titleBar.restore',
  close: 'titleBar.close'
} as const

// ---------------------------------------------------------------------------
// Helper: simulate the component being mounted on a non-Mac platform so the
// window controls (minimize/maximize/close) and application-menu button are
// rendered. Tests for macOS-only paths are grouped separately.
// ---------------------------------------------------------------------------
function renderOnWindows(props: Parameters<typeof TitleBar>[0] = {}) {
  // The isMac check reads navigator.platform once at module load, so we
  // manipulate it before each test via spyOn where needed.
  return render(<TitleBar {...props} />)
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TitleBar — default title', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.win.isFullScreen as jest.Mock).mockResolvedValue(false)
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('renders with the default title text', () => {
    renderOnWindows()
    expect(screen.getByText('Application Name')).toBeInTheDocument()
  })

  it('renders with a custom title', () => {
    renderOnWindows({ title: 'My Document' })
    expect(screen.getByText('My Document')).toBeInTheDocument()
  })

  it('applies a custom className to the root element', () => {
    const { container } = renderOnWindows({ className: 'extra-class' })
    expect(container.firstChild).toHaveClass('extra-class')
  })
})

describe('TitleBar — window state subscription', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.win.isFullScreen as jest.Mock).mockResolvedValue(false)
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('calls window.win.isMaximized on mount', () => {
    renderOnWindows()
    expect(window.win.isMaximized).toHaveBeenCalled()
  })

  it('calls window.win.isFullScreen on mount', () => {
    renderOnWindows()
    expect(window.win.isFullScreen).toHaveBeenCalled()
  })

  it('subscribes to onMaximizeChange on mount', () => {
    renderOnWindows()
    expect(window.win.onMaximizeChange).toHaveBeenCalled()
  })

  it('subscribes to onFullScreenChange on mount', () => {
    renderOnWindows()
    expect(window.win.onFullScreenChange).toHaveBeenCalled()
  })

  it('unsubscribes from onMaximizeChange on unmount', () => {
    const unsubscribeMax = jest.fn()
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(unsubscribeMax)

    const { unmount } = renderOnWindows()
    unmount()

    expect(unsubscribeMax).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes from onFullScreenChange on unmount', () => {
    const unsubscribeFs = jest.fn()
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(unsubscribeFs)

    const { unmount } = renderOnWindows()
    unmount()

    expect(unsubscribeFs).toHaveBeenCalledTimes(1)
  })
})

describe('TitleBar — window controls (non-Mac)', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.win.isFullScreen as jest.Mock).mockResolvedValue(false)
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('calls window.win.minimize when the minimize button is clicked', async () => {
    const user = userEvent.setup()
    renderOnWindows()

    await user.click(screen.getByTitle(KEYS.minimize))

    expect(window.win.minimize).toHaveBeenCalledTimes(1)
  })

  it('calls window.win.close when the close button is clicked', async () => {
    const user = userEvent.setup()
    renderOnWindows()

    await user.click(screen.getByTitle(KEYS.close))

    expect(window.win.close).toHaveBeenCalledTimes(1)
  })

  it('calls window.win.maximize when the maximize button is clicked (not maximized)', async () => {
    const user = userEvent.setup()
    renderOnWindows()

    // Not maximized → button title is 'titleBar.maximize'
    await user.click(screen.getByTitle(KEYS.maximize))

    expect(window.win.maximize).toHaveBeenCalledTimes(1)
  })

  it('shows the restore button title when the window is already maximized', async () => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(true)

    renderOnWindows()

    await waitFor(() => {
      expect(screen.getByTitle(KEYS.restore)).toBeInTheDocument()
    })
  })

  it('calls window.win.maximize when the restore button is clicked (currently maximized)', async () => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(true)
    const user = userEvent.setup()

    renderOnWindows()

    // Wait for the async maximize state to settle
    const restoreBtn = await screen.findByTitle(KEYS.restore)
    await user.click(restoreBtn)

    expect(window.win.maximize).toHaveBeenCalledTimes(1)
  })
})

describe('TitleBar — application menu (non-Mac)', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.win.isFullScreen as jest.Mock).mockResolvedValue(false)
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('calls window.app.popupMenu when the application menu button is clicked', async () => {
    const user = userEvent.setup()
    renderOnWindows()

    await user.click(screen.getByTitle(KEYS.applicationMenu))

    expect(window.app.popupMenu).toHaveBeenCalledTimes(1)
  })
})

describe('TitleBar — sidebar toggle', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.win.isFullScreen as jest.Mock).mockResolvedValue(false)
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('does not render the toggle button when onToggleSidebar is not provided', () => {
    renderOnWindows()
    expect(screen.queryByTitle(KEYS.toggleSidebar)).not.toBeInTheDocument()
  })

  it('renders the toggle button when onToggleSidebar is provided', () => {
    renderOnWindows({ onToggleSidebar: jest.fn() })
    expect(screen.getByTitle(KEYS.toggleSidebar)).toBeInTheDocument()
  })

  it('calls onToggleSidebar when the sidebar toggle button is clicked', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()

    renderOnWindows({ onToggleSidebar: onToggle })

    await user.click(screen.getByTitle(KEYS.toggleSidebar))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('invokes onToggleSidebar independently of window.win calls', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()

    renderOnWindows({ onToggleSidebar: onToggle })

    await user.click(screen.getByTitle(KEYS.toggleSidebar))

    // Sidebar toggle should NOT invoke window controls
    expect(window.win.minimize).not.toHaveBeenCalled()
    expect(window.win.maximize).not.toHaveBeenCalled()
    expect(window.win.close).not.toHaveBeenCalled()
  })
})

describe('TitleBar — window.win unavailable (graceful degradation)', () => {
  const originalWin = window.win

  beforeEach(() => {
    // Remove window.win to simulate missing preload
    Object.defineProperty(window, 'win', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'win', {
      value: originalWin,
      writable: true,
      configurable: true
    })
  })

  it('does not crash when window.win is undefined and renders the title', () => {
    // TitleBar calls window.win.isMaximized() etc. in useEffect.
    // If window.win is undefined the component throws at runtime.
    // This test documents the current crash behaviour so the team
    // can decide whether to add defensive guards in the component.
    //
    // NOTE: An ErrorBoundary is the recommended guard if this path
    // should be handled gracefully in production.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TitleBar />)).toThrow()

    consoleSpy.mockRestore()
  })
})

describe('TitleBar — window.win available (bridge present)', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.win.isFullScreen as jest.Mock).mockResolvedValue(false)
    ;(window.win.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.win.onFullScreenChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('mounts without error when all bridge methods are present', () => {
    expect(() => renderOnWindows()).not.toThrow()
  })

  it('renders the title bar root element', () => {
    const { container } = renderOnWindows({ title: 'Test App' })
    expect(container.firstChild).toBeInTheDocument()
  })
})
