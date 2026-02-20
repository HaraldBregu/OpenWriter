/**
 * Tests for useTheme hook.
 * Applies theme changes from main process to the document element.
 */
import { renderHook } from '@testing-library/react'
import { useTheme } from '../../../../src/renderer/src/hooks/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('should add dark class on mount', () => {
    renderHook(() => useTheme())

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should subscribe to theme changes', () => {
    renderHook(() => useTheme())

    expect(window.api.onThemeChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should toggle dark class when theme changes to light', () => {
    ;(window.api.onThemeChange as jest.Mock).mockImplementation((callback: (theme: string) => void) => {
      // Immediately invoke with 'light' theme
      callback('light')
      return jest.fn()
    })

    renderHook(() => useTheme())

    // After receiving 'light' theme, dark class should be removed
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should keep dark class when theme changes to dark', () => {
    ;(window.api.onThemeChange as jest.Mock).mockImplementation((callback: (theme: string) => void) => {
      callback('dark')
      return jest.fn()
    })

    renderHook(() => useTheme())

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should clean up listener on unmount', () => {
    const unsubscribe = jest.fn()
    ;(window.api.onThemeChange as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useTheme())

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
