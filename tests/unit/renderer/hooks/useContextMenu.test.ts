/**
 * Tests for useContextMenu hook.
 * Exposes context menu triggers for normal and editable contexts.
 */
import { renderHook, act } from '@testing-library/react'
import { useContextMenu } from '../../../../src/renderer/src/hooks/useContextMenu'

describe('useContextMenu', () => {
  it('should call showContextMenu on window.api', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.showContextMenu()
    })

    expect(window.api.showContextMenu).toHaveBeenCalled()
  })

  it('should call showContextMenuEditable on window.api', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.showContextMenuEditable()
    })

    expect(window.api.showContextMenuEditable).toHaveBeenCalled()
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
