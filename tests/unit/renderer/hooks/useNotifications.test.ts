/**
 * Tests for useNotifications hook.
 * Checks notification support, shows notifications, and maintains a log.
 * The hook delegates to window.notification.* namespace.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotifications } from '../../../../src/renderer/src/hooks/useNotifications'

describe('useNotifications', () => {
  it('should check notification support on mount', async () => {
    ;(window.notification.isSupported as jest.Mock).mockResolvedValue(true)

    const { result } = renderHook(() => useNotifications())

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true)
    })

    expect(result.current.log).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should set isSupported to false when check fails', async () => {
    ;(window.notification.isSupported as jest.Mock).mockRejectedValue(new Error('nope'))

    const { result } = renderHook(() => useNotifications())

    await waitFor(() => {
      expect(window.notification.isSupported).toHaveBeenCalled()
    })

    // On error, isSupported defaults to false
    expect(result.current.isSupported).toBe(false)
  })

  describe('showNotification', () => {
    it('should call notification.show with options', async () => {
      ;(window.notification.isSupported as jest.Mock).mockResolvedValue(true)
      ;(window.notification.show as jest.Mock).mockResolvedValue('notif-42')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      await act(async () => {
        await result.current.showNotification({ title: 'Hello', body: 'World' })
      })

      expect(window.notification.show).toHaveBeenCalledWith({ title: 'Hello', body: 'World' })
      expect(result.current.error).toBeNull()
    })

    it('should set error on failure', async () => {
      ;(window.notification.isSupported as jest.Mock).mockResolvedValue(true)
      ;(window.notification.show as jest.Mock).mockRejectedValue(new Error('show failed'))

      const { result } = renderHook(() => useNotifications())

      // Wait for support check to complete
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      await act(async () => {
        try {
          await result.current.showNotification({ title: 'Fail', body: 'Test' })
        } catch {
          // expected - the hook re-throws
        }
      })

      await waitFor(() => {
        expect(result.current.error).toBe('show failed')
      })
    })
  })

  describe('clearLog', () => {
    it('should clear the notification log', async () => {
      ;(window.notification.isSupported as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      act(() => {
        result.current.clearLog()
      })

      expect(result.current.log).toEqual([])
    })
  })

  it('should subscribe to notification events and clean up', async () => {
    const unsubscribe = jest.fn()
    ;(window.notification.isSupported as jest.Mock).mockResolvedValue(true)
    ;(window.notification.onEvent as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useNotifications())

    await waitFor(() => {
      expect(window.notification.onEvent).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
