/**
 * Tests for usePlatform hook.
 * Returns the OS platform string, calling the API once and caching the result.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { usePlatform } from '../../../../src/renderer/src/hooks/usePlatform'

describe('usePlatform', () => {
  it('should return a valid platform string', async () => {
    ;(window.api.getPlatform as jest.Mock).mockResolvedValue('win32')

    const { result } = renderHook(() => usePlatform())

    // Initially returns sync-detected platform from user-agent
    expect(typeof result.current).toBe('string')
    expect(['win32', 'darwin', 'linux']).toContain(result.current)
  })

  it('should return a consistent value across re-renders', async () => {
    ;(window.api.getPlatform as jest.Mock).mockResolvedValue('win32')

    const { result, rerender } = renderHook(() => usePlatform())

    // Wait for the async platform detection to settle
    await waitFor(() => {
      expect(result.current).toBe('win32')
    })

    rerender()
    expect(result.current).toBe('win32')
  })
})
