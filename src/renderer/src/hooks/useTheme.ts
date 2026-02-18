import { useEffect } from 'react'

/**
 * Hook to handle theme changes from the main process
 * Applies theme changes to the document element
 */
export function useTheme(): void {
  useEffect(() => {
    // Start in dark mode to match Electron's nativeTheme default
    document.documentElement.classList.add('dark')

    const cleanup = window.api.onThemeChange((theme: string) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    })
    return cleanup
  }, [])
}
