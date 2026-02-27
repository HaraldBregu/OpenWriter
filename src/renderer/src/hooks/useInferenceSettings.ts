import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppSelector } from '@/store'
import { selectEffectiveInferenceSettings } from '@/store/aiSettingsSlice'
import type { InferenceSettings } from '../../../shared/types/aiSettings'
import { DEFAULT_INFERENCE_SETTINGS } from '../../../shared/types/aiSettings'

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

interface UseInferenceSettingsReturn {
  /** The resolved InferenceSettings for the current section. */
  settings: InferenceSettings
  /**
   * True once the section config has been fetched from disk (or determined
   * to not exist). Use this to suppress UI flicker on first render.
   */
  isLoaded: boolean
  /**
   * User-driven change handler. Updates local state immediately and debounces
   * (500 ms) the disk write so rapid slider drags don't spam IPC calls.
   */
  onChange: (next: InferenceSettings) => void
  /**
   * Overwrite local state with a snapshot without triggering a disk write.
   * Use this when restoring inference settings from a saved conversation.
   */
  applySnapshot: (snapshot: InferenceSettings) => void
  /**
   * Reset to section-level defaults (loaded from disk) or, if no section
   * config exists, the provider-level global fallback. Use this when the
   * user starts a new conversation.
   */
  resetToSectionDefaults: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages inference settings for a single personality section.
 *
 * Resolution order (highest precedence first):
 *   1. Local React state (in-memory, session-scoped)
 *   2. Section config from disk (`window.workspace.personality.loadSectionConfig`)
 *   3. Provider-level global fallback from Redux (`selectEffectiveInferenceSettings`)
 *   4. Hard-coded `DEFAULT_INFERENCE_SETTINGS`
 *
 * @param sectionId        - The personality section identifier.
 * @param defaultProviderId - Provider used for the global Redux fallback
 *                            (defaults to 'openai').
 */
export function useInferenceSettings(
  sectionId: string,
  defaultProviderId = 'openai'
): UseInferenceSettingsReturn {
  // Global provider-level fallback from Redux
  const globalFallback = useAppSelector(selectEffectiveInferenceSettings(defaultProviderId))

  // Local resolved settings (what the UI renders)
  const [settings, setSettings] = useState<InferenceSettings>(() => ({
    ...DEFAULT_INFERENCE_SETTINGS,
    providerId: defaultProviderId
  }))

  // Stable section defaults (null = not loaded yet or absent)
  const sectionDefaultsRef = useRef<InferenceSettings | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Debounce timer for the disk write
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Load section config on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    window.workspace
      .loadSectionConfig({ sectionId })
      .then((config) => {
        if (cancelled) return

        if (config) {
          const resolved: InferenceSettings = {
            providerId: config.provider ?? globalFallback.providerId,
            modelId: config.model ?? globalFallback.modelId,
            temperature:
              typeof config.temperature === 'number'
                ? config.temperature
                : globalFallback.temperature,
            maxTokens:
              config.maxTokens !== undefined && config.maxTokens !== null
                ? config.maxTokens
                : globalFallback.maxTokens,
            reasoning:
              typeof config.reasoning === 'boolean'
                ? config.reasoning
                : globalFallback.reasoning
          }
          sectionDefaultsRef.current = resolved
          setSettings(resolved)
        } else {
          // No section config — use the provider-level global fallback
          sectionDefaultsRef.current = null
          setSettings(globalFallback)
        }
        setIsLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn(
          `[useInferenceSettings:${sectionId}] Failed to load section config:`,
          err
        )
        // Degrade gracefully: fall back to global settings
        setSettings(globalFallback)
        setIsLoaded(true)
      })

    return () => {
      cancelled = true
    }
    // globalFallback intentionally omitted — we only want this to run on mount.
    // Changes to the global fallback are applied via resetToSectionDefaults().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  // Clean up the debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const onChange = useCallback(
    (next: InferenceSettings): void => {
      setSettings(next)

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        window.workspace
          .saveSectionConfig({
            sectionId,
            update: {
              provider: next.providerId,
              model: next.modelId,
              temperature: next.temperature,
              maxTokens: next.maxTokens,
              reasoning: next.reasoning
            }
          })
          .then((saved) => {
            // Update sectionDefaults reference so resetToSectionDefaults() is
            // consistent after a user edit.
            sectionDefaultsRef.current = {
              providerId: saved.provider,
              modelId: saved.model,
              temperature:
                typeof saved.temperature === 'number'
                  ? saved.temperature
                  : globalFallback.temperature,
              maxTokens:
                saved.maxTokens !== undefined && saved.maxTokens !== null
                  ? saved.maxTokens
                  : globalFallback.maxTokens,
              reasoning:
                typeof saved.reasoning === 'boolean'
                  ? saved.reasoning
                  : globalFallback.reasoning
            }
          })
          .catch((err) => {
            console.warn(
              `[useInferenceSettings:${sectionId}] Failed to save section config:`,
              err
            )
          })
      }, 500)
    },
    // globalFallback is captured via ref-like closure; changes are stable
    // between renders because the selector memoises the output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionId]
  )

  const applySnapshot = useCallback((snapshot: InferenceSettings): void => {
    // No disk write — just update local state to reflect the loaded conversation.
    setSettings(snapshot)
  }, [])

  const resetToSectionDefaults = useCallback((): void => {
    const next = sectionDefaultsRef.current ?? globalFallback
    setSettings(next)
  }, [globalFallback])

  return { settings, isLoaded, onChange, applySnapshot, resetToSectionDefaults }
}
