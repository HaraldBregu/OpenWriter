/**
 * Tests for useWindowManager hook.
 * Manages child/modal/frameless/widget windows and subscribes to state changes.
 * The hook delegates to window.wm.* namespace.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWindowManager } from '../../../../src/renderer/src/hooks/useWindowManager'

describe('useWindowManager', () => {
  it('should initialize and fetch window state', async () => {
    ;(window.wm.getState as jest.Mock).mockResolvedValue({
      windows: [{ id: 1, type: 'main', title: 'Main', createdAt: 1000 }]
    })

    const { result } = renderHook(() => useWindowManager())

    await waitFor(() => {
      expect(result.current.windows).toHaveLength(1)
    })

    expect(result.current.windows[0].type).toBe('main')
    expect(result.current.error).toBeNull()
  })

  it('should set error on init failure', async () => {
    ;(window.wm.getState as jest.Mock).mockRejectedValue(new Error('wm init fail'))

    const { result } = renderHook(() => useWindowManager())

    await waitFor(() => {
      expect(result.current.error).toBe('wm init fail')
    })
  })

  describe('createChild', () => {
    it('should call wm.createChild', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })
      ;(window.wm.createChild as jest.Mock).mockResolvedValue({ id: 2, type: 'child', title: 'Child', createdAt: 2000 })

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.createChild()
      })

      expect(window.wm.createChild).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('should set error on failure', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })
      ;(window.wm.createChild as jest.Mock).mockRejectedValue(new Error('child fail'))

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.createChild()
      })

      expect(result.current.error).toBe('child fail')
    })
  })

  describe('createModal', () => {
    it('should call wm.createModal', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.createModal()
      })

      expect(window.wm.createModal).toHaveBeenCalled()
    })
  })

  describe('createFrameless', () => {
    it('should call wm.createFrameless', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.createFrameless()
      })

      expect(window.wm.createFrameless).toHaveBeenCalled()
    })
  })

  describe('createWidget', () => {
    it('should call wm.createWidget', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.createWidget()
      })

      expect(window.wm.createWidget).toHaveBeenCalled()
    })
  })

  describe('closeWindow', () => {
    it('should call wm.closeWindow with the window ID', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.closeWindow(5)
      })

      expect(window.wm.closeWindow).toHaveBeenCalledWith(5)
    })
  })

  describe('closeAll', () => {
    it('should call wm.closeAll', async () => {
      ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })

      const { result } = renderHook(() => useWindowManager())

      await act(async () => {
        await result.current.closeAll()
      })

      expect(window.wm.closeAll).toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('should re-fetch window state', async () => {
      ;(window.wm.getState as jest.Mock)
        .mockResolvedValueOnce({ windows: [] })
        .mockResolvedValueOnce({ windows: [{ id: 10, type: 'child', title: 'New', createdAt: 5000 }] })

      const { result } = renderHook(() => useWindowManager())

      await waitFor(() => {
        expect(result.current.windows).toEqual([])
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.windows).toHaveLength(1)
    })
  })

  it('should clean up state change listener on unmount', async () => {
    const unsubscribe = jest.fn()
    ;(window.wm.getState as jest.Mock).mockResolvedValue({ windows: [] })
    ;(window.wm.onStateChange as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useWindowManager())

    await waitFor(() => {
      expect(window.wm.onStateChange).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
