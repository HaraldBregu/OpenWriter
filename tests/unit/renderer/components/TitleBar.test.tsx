/**
 * Tests for TitleBar component.
 * Renders the application title bar with window controls and sidebar toggle.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TitleBar } from '../../../../src/renderer/src/components/TitleBar'

// Mock lucide-react to avoid SVG rendering issues in jsdom
jest.mock('lucide-react', () => ({
  Menu: (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': 'menu-icon' }),
  PanelLeft: (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': 'panel-left-icon' }),
  Minus: (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': 'minus-icon' }),
  X: (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': 'x-icon' })
}))

describe('TitleBar', () => {
  beforeEach(() => {
    ;(window.api.windowIsMaximized as jest.Mock).mockResolvedValue(false)
    ;(window.api.onMaximizeChange as jest.Mock).mockReturnValue(jest.fn())
  })

  it('should render with default title', () => {
    render(<TitleBar />)

    expect(screen.getByText('Application Name')).toBeInTheDocument()
  })

  it('should render with custom title', () => {
    render(<TitleBar title="Custom Title" />)

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  it('should check maximized state on mount', () => {
    render(<TitleBar />)

    expect(window.api.windowIsMaximized).toHaveBeenCalled()
  })

  it('should subscribe to maximize changes', () => {
    render(<TitleBar />)

    expect(window.api.onMaximizeChange).toHaveBeenCalled()
  })

  it('should clean up maximize change listener on unmount', () => {
    const unsubscribe = jest.fn()
    ;(window.api.onMaximizeChange as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = render(<TitleBar />)

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should call onToggleSidebar when sidebar toggle is clicked', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()

    render(<TitleBar onToggleSidebar={onToggle} />)

    await user.click(screen.getByTitle('Toggle sidebar'))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('should call windowMinimize when minimize button is clicked', async () => {
    const user = userEvent.setup()

    render(<TitleBar />)

    await user.click(screen.getByTitle('Minimize'))

    expect(window.api.windowMinimize).toHaveBeenCalled()
  })

  it('should call windowClose when close button is clicked', async () => {
    const user = userEvent.setup()

    render(<TitleBar />)

    await user.click(screen.getByTitle('Close'))

    expect(window.api.windowClose).toHaveBeenCalled()
  })

  it('should call windowMaximize when maximize button is clicked', async () => {
    const user = userEvent.setup()

    render(<TitleBar />)

    // Default state: not maximized, so title should be "Maximize"
    await user.click(screen.getByTitle('Maximize'))

    expect(window.api.windowMaximize).toHaveBeenCalled()
  })

  it('should show Restore title when window is maximized', async () => {
    ;(window.api.windowIsMaximized as jest.Mock).mockResolvedValue(true)

    render(<TitleBar />)

    await waitFor(() => {
      expect(screen.getByTitle('Restore')).toBeInTheDocument()
    })
  })

  it('should call popupMenu when menu button is clicked', async () => {
    const user = userEvent.setup()

    render(<TitleBar />)

    await user.click(screen.getByTitle('Application menu'))

    expect(window.api.popupMenu).toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    const { container } = render(<TitleBar className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
