/**
 * Tests for WindowControls component.
 * Renders macOS-style traffic-light window control buttons.
 * The component uses window.win.* namespace.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WindowControls } from '../../../../src/renderer/src/components/WindowControls'

describe('WindowControls', () => {
  beforeEach(() => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(false)
  })

  it('should render three buttons (close, minimize, maximize)', () => {
    render(<WindowControls />)

    expect(screen.getByTitle('Close')).toBeInTheDocument()
    expect(screen.getByTitle('Minimize')).toBeInTheDocument()
    expect(screen.getByTitle('Maximize')).toBeInTheDocument()
  })

  it('should check maximized state on mount', () => {
    render(<WindowControls />)

    expect(window.win.isMaximized).toHaveBeenCalled()
  })

  it('should call window.win.close when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<WindowControls />)

    await user.click(screen.getByTitle('Close'))

    expect(window.win.close).toHaveBeenCalled()
  })

  it('should call window.win.minimize when minimize button is clicked', async () => {
    const user = userEvent.setup()
    render(<WindowControls />)

    await user.click(screen.getByTitle('Minimize'))

    expect(window.win.minimize).toHaveBeenCalled()
  })

  it('should call window.win.maximize when maximize button is clicked', async () => {
    const user = userEvent.setup()
    render(<WindowControls />)

    await user.click(screen.getByTitle('Maximize'))

    expect(window.win.maximize).toHaveBeenCalled()
  })

  it('should show Restore title when window is maximized', async () => {
    ;(window.win.isMaximized as jest.Mock).mockResolvedValue(true)

    render(<WindowControls />)

    // Wait for the state to update
    const button = await screen.findByTitle('Restore')
    expect(button).toBeInTheDocument()
  })
})
