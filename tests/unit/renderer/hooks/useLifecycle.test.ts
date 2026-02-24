/**
 * Tests for useLifecycle hook.
 * Manages app lifecycle state, events, and restart functionality.
 * The hook delegates to window.lifecycle.* namespace.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLifecycle } from '../../../../src/renderer/src/hooks/useLifecycle'

describe('useLifecycle', () => {
  it('should initialize and fetch lifecycle state', async () => {
    ;(window.lifecycle.getState as jest.Mock).mockResolvedValue({
      isSingleInstance: true,
      events: [{ type: 'app-ready', timestamp: 1000 }],
      appReadyAt: 1000,
      platform: 'win32'
    })

    const { result } = renderHook(() => useLifecycle())

    await waitFor(() => {
      expect(result.current.platform).toBe('win32')
    })

    expect(result.current.isSingleInstance).toBe(true)
    expect(result.current.events).toHaveLength(1)
    expect(result.current.appReadyAt).toBe(1000)
    expect(result.current.error).toBeNull()
  })

  it('should set error when initialization fails', async () => {
    ;(window.lifecycle.getState as jest.Mock).mockRejectedValue(new Error('init fail'))

    const { result } = renderHook(() => useLifecycle())

    await waitFor(() => {
      expect(result.current.error).toBe('init fail')
    })
  })

  describe('restart', () => {
    it('should call lifecycle.restart', async () => {
      ;(window.lifecycle.getState as jest.Mock).mockResolvedValue({
        isSingleInstance: true, events: [], appReadyAt: null, platform: 'win32'
      })
      ;(window.lifecycle.restart as jest.Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLifecycle())

      await act(async () => {
        await result.current.restart()
      })

      expect(window.lifecycle.restart).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('should set error when restart fails', async () => {
      ;(window.lifecycle.getState as jest.Mock).mockResolvedValue({
        isSingleInstance: true, events: [], appReadyAt: null, platform: 'win32'
      })
      ;(window.lifecycle.restart as jest.Mock).mockRejectedValue(new Error('restart fail'))

      const { result } = renderHook(() => useLifecycle())

      await act(async () => {
        await result.current.restart()
      })

      expect(result.current.error).toBe('restart fail')
    })
  })

  describe('refreshEvents', () => {
    it('should fetch and update events', async () => {
      ;(window.lifecycle.getState as jest.Mock).mockResolvedValue({
        isSingleInstance: true, events: [], appReadyAt: null, platform: 'win32'
      })
      ;(window.lifecycle.getEvents as jest.Mock).mockResolvedValue([
        { type: 'ready', timestamp: 100 },
        { type: 'focus', timestamp: 200 }
      ])

      const { result } = renderHook(() => useLifecycle())

      await act(async () => {
        await result.current.refreshEvents()
      })

      expect(result.current.events).toHaveLength(2)
    })
  })

  it('should clean up lifecycle event listener on unmount', async () => {
    const unsubscribe = jest.fn()
    ;(window.lifecycle.getState as jest.Mock).mockResolvedValue({
      isSingleInstance: true, events: [], appReadyAt: null, platform: 'win32'
    })
    ;(window.lifecycle.onEvent as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useLifecycle())

    await waitFor(() => {
      expect(window.lifecycle.onEvent).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
