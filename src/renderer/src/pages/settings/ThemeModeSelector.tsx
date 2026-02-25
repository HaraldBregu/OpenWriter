import React from 'react'
import { useTranslation } from 'react-i18next'
import { AppRadioGroup, AppRadioGroupItem, AppLabel } from '@/components/app'
import { useThemeMode, useAppActions } from '../../contexts'
import type { ThemeMode } from '../../contexts'

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
  const { t } = useTranslation()

  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    {
      value: 'light',
      label: t('settings.theme.light'),
      description: t('settings.theme.lightDescription'),
    },
    {
      value: 'dark',
      label: t('settings.theme.dark'),
      description: t('settings.theme.darkDescription'),
    },
    {
      value: 'system',
      label: t('settings.theme.system'),
      description: t('settings.theme.systemDescription'),
    },
  ]

  return (
    <AppRadioGroup
      value={themeMode}
      onValueChange={(value) => setTheme(value as ThemeMode)}
      className="grid gap-0"
      aria-label={t('settings.theme.title')}
    >
      {themeOptions.map((option) => (
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
