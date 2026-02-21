/**
 * Example Component: Theme Toggle
 *
 * Demonstrates how to use the AppContext for theme management.
 * This component shows best practices for reading and updating shared state.
 */

import { useThemeMode, useAppActions } from '@/contexts'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggleExample() {
  const currentTheme = useThemeMode()
  const { setTheme } = useAppActions()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor }
  ]

  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-sidebar-accent/50">
      <span className="text-sm font-medium text-sidebar-foreground">Theme:</span>
      <div className="flex gap-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
              ${currentTheme === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }
            `}
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Alternative: Compact Theme Toggle (Icon Only)
 */
export function CompactThemeToggle() {
  const currentTheme = useThemeMode()
  const { setTheme } = useAppActions()

  const cycleTheme = () => {
    const cycle = { light: 'dark', dark: 'system', system: 'light' } as const
    setTheme(cycle[currentTheme])
  }

  const Icon = currentTheme === 'light' ? Sun : currentTheme === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      title={`Current theme: ${currentTheme}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
