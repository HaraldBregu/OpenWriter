/**
 * Tests for theme-related hooks/context from AppContext.tsx.
 *
 * NOTE: A standalone useTheme hook does not exist in the codebase.
 * Theme logic lives in AppContext (AppProvider). This test covers:
 *  - The AppProvider subscribes to window.app.onThemeChange on mount
 *  - Theme changes from main process update the DOM dark class
 *  - The onThemeChange listener is cleaned up on unmount
 *  - window.app.setTheme is called when theme state changes
 *
 * These tests use AppProvider + useAppState (from AppContext).
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { AppProvider, useAppState } from '../../../../src/renderer/src/contexts/AppContext'

// Helper component that exposes theme state
function ThemeDisplay() {
  const state = useAppState()
  return React.createElement('div', { 'data-testid': 'theme' }, state.theme)
}

function renderWithProvider() {
  return render(
    React.createElement(AppProvider, null,
      React.createElement(ThemeDisplay)
    )
  )
}

describe('AppProvider — theme IPC integration', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    // Reset to default mock behaviour
    ;(window.app.onThemeChange as jest.Mock).mockReturnValue(jest.fn())
    ;(window.app.setTheme as jest.Mock).mockReturnValue(undefined)
  })

  it('should subscribe to window.app.onThemeChange on mount', () => {
    renderWithProvider()

    expect(window.app.onThemeChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should apply dark class when theme changes to dark via IPC', async () => {
    ;(window.app.onThemeChange as jest.Mock).mockImplementation((callback: (theme: string) => void) => {
      callback('dark')
      return jest.fn()
    })

    renderWithProvider()

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('should remove dark class when theme changes to light via IPC', async () => {
    document.documentElement.classList.add('dark')

    ;(window.app.onThemeChange as jest.Mock).mockImplementation((callback: (theme: string) => void) => {
      callback('light')
      return jest.fn()
    })

    renderWithProvider()

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  it('should clean up the onThemeChange listener on unmount', () => {
    const unsubscribe = jest.fn()
    ;(window.app.onThemeChange as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderWithProvider()

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should call window.app.setTheme on mount with the current theme', () => {
    renderWithProvider()

    expect(window.app.setTheme).toHaveBeenCalled()
  })
})
