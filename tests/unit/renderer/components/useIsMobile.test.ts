/**
 * Tests for useIsMobile hook (shadcn/ui).
 * Detects mobile viewport based on window width.
 */
import { renderHook } from '@testing-library/react'
import { useIsMobile } from '../../../../src/renderer/src/components/hooks/use-mobile'

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true
    })
  })

  it('should return false for desktop viewport (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useIsMobile())

    // After effect runs, should detect desktop
    expect(result.current).toBe(false)
  })

  it('should return true for mobile viewport (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('should return false at exactly 768px (boundary)', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 768,
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })
})
