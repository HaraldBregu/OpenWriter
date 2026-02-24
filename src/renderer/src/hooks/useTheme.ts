import { useEffect } from 'react'
import { useThemeMode } from '../contexts'

const DARK_CLASS = 'dark'

function applyThemeClass(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add(DARK_CLASS)
  } else if (theme === 'light') {
    root.classList.remove(DARK_CLASS)
  } else {
    // system — honour the OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle(DARK_CLASS, prefersDark)
  }
}

/**
 * Applies the active theme class to <html> and keeps it in sync with:
 * 1. The user's chosen ThemeMode stored in AppContext (light / dark / system)
 * 2. OS-level colour-scheme changes when the mode is "system"
 * 3. IPC theme-change events from the Electron main process
 *    (only honoured when the user-selected mode is "system")
 */
export function useTheme(): void {
  const themeMode = useThemeMode()

  // Apply the stored preference immediately on every mode change
  useEffect(() => {
    applyThemeClass(themeMode)
  }, [themeMode])

  // When in "system" mode, track OS preference changes in real-time
  useEffect(() => {
    if (themeMode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleOsChange = (e: MediaQueryListEvent): void => {
      document.documentElement.classList.toggle(DARK_CLASS, e.matches)
    }

    mq.addEventListener('change', handleOsChange)
    return () => mq.removeEventListener('change', handleOsChange)
  }, [themeMode])

  // Listen for IPC theme-change events from the Electron menu.
  // We only honour them when the user is in "system" mode so that an explicit
  // user preference (light/dark) is never silently overridden by the menu.
  useEffect(() => {
    if (themeMode !== 'system') return

    const cleanup = window.api.onThemeChange((theme: string) => {
      document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
    })
    return cleanup
  }, [themeMode])
}
