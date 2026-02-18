import { useCallback } from 'react'

interface UseContextMenuReturn {
  showContextMenu: () => void
  showContextMenuEditable: () => void
}

export function useContextMenu(): UseContextMenuReturn {
  const showContextMenu = useCallback(() => {
    window.api.showContextMenu()
  }, [])

  const showContextMenuEditable = useCallback(() => {
    window.api.showContextMenuEditable()
  }, [])

  return {
    showContextMenu,
    showContextMenuEditable
  }
}
