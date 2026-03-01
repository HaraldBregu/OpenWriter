import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  loadAISettings,
  saveProviderSettings,
  setSelectedModelLocal,
  selectAISettingsStatus,
  selectAllProviderSettings
} from '@/store/aiSettingsSlice'
import type { ProviderSettings } from '../../../shared/aiSettings'

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

interface UseAISettingsReturn {
  providerSettings: Record<string, ProviderSettings>
  status: 'idle' | 'loading' | 'ready' | 'error'
  /**
   * Select a model for a provider. Applies an optimistic local update
   * immediately, then persists to the store in the background.
   */
  selectModel: (providerId: string, modelId: string) => void
  /**
   * Persist the full ProviderSettings record for a single provider.
   * Also used internally by selectModel and updateApiToken.
   */
  saveProviderSettings: (providerId: string, settings: ProviderSettings) => void
  /**
   * Update the API token for a provider. Merges with existing settings
   * before persisting so other fields are not overwritten.
   */
  updateApiToken: (providerId: string, token: string) => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Bootstrap hook for AI settings. Loads from the persisted store on first
 * mount (when status is 'idle') and exposes typed actions for model selection
 * and API token management.
 *
 * Place this hook once in a high-level component (e.g. AppLayout or a
 * settings initialiser) so the data is available application-wide.
 */
export function useAISettings(): UseAISettingsReturn {
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectAISettingsStatus)
  const providerSettings = useAppSelector(selectAllProviderSettings)

  // One-time bootstrap: load from disk when the slice hasn't been populated yet.
  useEffect(() => {
    if (status === 'idle') {
      dispatch(loadAISettings())
    }
  }, [dispatch, status])

  const handleSelectModel = useCallback(
    (providerId: string, modelId: string): void => {
      // Optimistic update — UI is instant.
      dispatch(setSelectedModelLocal({ providerId, modelId }))

      // Persist. Build the full ProviderSettings object from current state so
      // the write is always a complete record.
      const current = providerSettings[providerId]
      if (!current) {
        console.warn(`[useAISettings] selectModel: no settings found for provider "${providerId}"`)
        return
      }
      dispatch(
        saveProviderSettings({
          providerId,
          settings: { ...current, selectedModel: modelId }
        })
      )
    },
    [dispatch, providerSettings]
  )

  const handleSaveProviderSettings = useCallback(
    (providerId: string, settings: ProviderSettings): void => {
      dispatch(saveProviderSettings({ providerId, settings }))
    },
    [dispatch]
  )

  const handleUpdateApiToken = useCallback(
    (providerId: string, token: string): void => {
      const current = providerSettings[providerId]
      if (!current) {
        console.warn(
          `[useAISettings] updateApiToken: no settings found for provider "${providerId}"`
        )
        return
      }
      dispatch(
        saveProviderSettings({
          providerId,
          settings: { ...current, apiToken: token }
        })
      )
    },
    [dispatch, providerSettings]
  )

  return {
    providerSettings,
    status,
    selectModel: handleSelectModel,
    saveProviderSettings: handleSaveProviderSettings,
    updateApiToken: handleUpdateApiToken
  }
}
