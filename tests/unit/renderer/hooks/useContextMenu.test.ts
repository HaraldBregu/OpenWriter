/**
 * Tests for useContextMenu hook.
 * Exposes context menu triggers for normal and editable contexts.
 * The hook delegates to window.app.showContextMenu / window.app.showContextMenuEditable.
 */
import { renderHook, act } from '@testing-library/react'
import { useContextMenu } from '../../../../src/renderer/src/hooks/useContextMenu'

describe('useContextMenu', () => {
  it('should call showContextMenu on window.app', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.showContextMenu()
    })

    expect(window.app.showContextMenu).toHaveBeenCalled()
  })

  it('should call showContextMenuEditable on window.app', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.showContextMenuEditable()
    })

    expect(window.app.showContextMenuEditable).toHaveBeenCalled()
  })

  it('should return stable function references', () => {
    const { result, rerender } = renderHook(() => useContextMenu())

    const firstShowContextMenu = result.current.showContextMenu
    const firstShowContextMenuEditable = result.current.showContextMenuEditable

    rerender()

    expect(result.current.showContextMenu).toBe(firstShowContextMenu)
    expect(result.current.showContextMenuEditable).toBe(firstShowContextMenuEditable)
  })
})
