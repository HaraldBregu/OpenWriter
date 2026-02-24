import React from 'react'
import { AppRadioGroup, AppRadioGroupItem, AppLabel } from '@/components/app'
import { useThemeMode, useAppActions } from '../../contexts'
import type { ThemeMode } from '../../contexts'

interface ThemeOption {
  value: ThemeMode
  label: string
  description: string
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Always use the light colour scheme'
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use the dark colour scheme'
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow the operating system preference'
  }
]

/**
 * Segmented radio-group control that lets users choose between
 * Light, Dark, and System theme modes.
 *
 * Reads from and writes to AppContext; the selection is persisted
 * automatically via AppProvider's localStorage effect.
 */
export function ThemeModeSelector(): React.ReactElement {
  const themeMode = useThemeMode()
  const { setTheme } = useAppActions()

  return (
    <AppRadioGroup
      value={themeMode}
      onValueChange={(value) => setTheme(value as ThemeMode)}
      className="grid gap-0"
      aria-label="Theme mode"
    >
      {THEME_OPTIONS.map((option) => (
        <div
          key={option.value}
          className="flex items-center justify-between px-4 py-3"
        >
          <div className="flex flex-col gap-0.5">
            <AppLabel
              htmlFor={`theme-${option.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {option.label}
            </AppLabel>
            <span className="text-xs text-muted-foreground">
              {option.description}
            </span>
          </div>
          <AppRadioGroupItem
            id={`theme-${option.value}`}
            value={option.value}
          />
        </div>
      ))}
    </AppRadioGroup>
  )
}
