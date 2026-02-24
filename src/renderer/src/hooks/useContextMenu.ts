import { useCallback } from 'react'

interface UseContextMenuReturn {
  showContextMenu: () => void
  showContextMenuEditable: () => void
}

export function useContextMenu(): UseContextMenuReturn {
  const showContextMenu = useCallback(() => {
    window.app.showContextMenu()
  }, [])

  const showContextMenuEditable = useCallback(() => {
    window.app.showContextMenuEditable()
  }, [])

  return {
    showContextMenu,
    showContextMenuEditable
  }
}
