import { createSlice, createSelector, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  ProviderSettings,
  InferenceSettings,
  InferenceDefaultsUpdate
} from '../../../shared/types/aiSettings'
import { DEFAULT_INFERENCE_SETTINGS } from '../../../shared/types/aiSettings'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AISettingsState {
  providerSettings: Record<string, ProviderSettings>
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}

const initialState: AISettingsState = {
  providerSettings: {},
  status: 'idle',
  error: null
}

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/**
 * Load all provider settings from the persisted store.
 * Called once on bootstrap — subsequent reads come from Redux state.
 */
export const loadAISettings = createAsyncThunk<
  Record<string, ProviderSettings>,
  void,
  { rejectValue: string }
>('aiSettings/load', async (_, { rejectWithValue }) => {
  try {
    const result = await window.app.getAllProviderSettings()
    return result ?? {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load AI settings'
    return rejectWithValue(message)
  }
})

/**
 * Persist the full ProviderSettings record for a single provider.
 * Use this for writes that combine model selection + token + inference fields.
 */
export const saveProviderSettings = createAsyncThunk<
  { providerId: string; settings: ProviderSettings },
  { providerId: string; settings: ProviderSettings },
  { rejectValue: string }
>('aiSettings/saveProvider', async ({ providerId, settings }, { rejectWithValue }) => {
  try {
    await window.store.setProviderSettings(providerId, settings)
    return { providerId, settings }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save provider settings'
    return rejectWithValue(message)
  }
})

/**
 * Persist a partial inference-defaults update for a single provider.
 * Only the fields present in `update` are written to the store.
 */
export const persistInferenceDefaults = createAsyncThunk<
  { providerId: string; update: InferenceDefaultsUpdate },
  { providerId: string; update: InferenceDefaultsUpdate },
  { rejectValue: string }
>('aiSettings/persistInferenceDefaults', async ({ providerId, update }, { rejectWithValue }) => {
  try {
    await window.store.setInferenceDefaults(providerId, update)
    return { providerId, update }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to persist inference defaults'
    return rejectWithValue(message)
  }
})

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const aiSettingsSlice = createSlice({
  name: 'aiSettings',
  initialState,
  reducers: {
    /**
     * Optimistic model selection — instantly reflected in the UI while the
     * async persist thunk runs in the background.
     */
    setSelectedModelLocal(
      state,
      action: PayloadAction<{ providerId: string; modelId: string }>
    ): void {
      const { providerId, modelId } = action.payload
      if (state.providerSettings[providerId]) {
        state.providerSettings[providerId].selectedModel = modelId
      }
    },

    /**
     * Optimistic inference-fields update — merges partial update into the
     * provider record so the sidebar reflects the new values immediately.
     */
    setInferenceDefaultsLocal(
      state,
      action: PayloadAction<{ providerId: string; update: InferenceDefaultsUpdate }>
    ): void {
      const { providerId, update } = action.payload
      if (!state.providerSettings[providerId]) return
      const provider = state.providerSettings[providerId]
      if (update.temperature !== undefined) provider.temperature = update.temperature
      if (update.maxTokens !== undefined) provider.maxTokens = update.maxTokens
      if (update.reasoning !== undefined) provider.reasoning = update.reasoning
    }
  },
  extraReducers: (builder) => {
    // loadAISettings
    builder
      .addCase(loadAISettings.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadAISettings.fulfilled, (state, action) => {
        state.providerSettings = action.payload
        state.status = 'ready'
        state.error = null
      })
      .addCase(loadAISettings.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'Unknown error loading AI settings'
      })

    // saveProviderSettings — update slice on success, keep any optimistic state on failure
    builder
      .addCase(saveProviderSettings.fulfilled, (state, action) => {
        const { providerId, settings } = action.payload
        state.providerSettings[providerId] = settings
      })
      .addCase(saveProviderSettings.rejected, (_state, action) => {
        console.error('[aiSettings] saveProviderSettings failed:', action.payload)
      })

    // persistInferenceDefaults — merge partial update on success
    builder
      .addCase(persistInferenceDefaults.fulfilled, (state, action) => {
        const { providerId, update } = action.payload
        if (!state.providerSettings[providerId]) return
        const provider = state.providerSettings[providerId]
        if (update.temperature !== undefined) provider.temperature = update.temperature
        if (update.maxTokens !== undefined) provider.maxTokens = update.maxTokens
        if (update.reasoning !== undefined) provider.reasoning = update.reasoning
      })
      .addCase(persistInferenceDefaults.rejected, (_state, action) => {
        console.error('[aiSettings] persistInferenceDefaults failed:', action.payload)
      })
  }
})

export const { setSelectedModelLocal, setInferenceDefaultsLocal } = aiSettingsSlice.actions

export default aiSettingsSlice.reducer

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

type AISettingsRootState = { aiSettings: AISettingsState }

export const selectAISettingsStatus = (state: AISettingsRootState): AISettingsState['status'] =>
  state.aiSettings.status

export const selectAISettingsError = (state: AISettingsRootState): string | null =>
  state.aiSettings.error

export const selectAllProviderSettings = (
  state: AISettingsRootState
): Record<string, ProviderSettings> => state.aiSettings.providerSettings

/** Returns the settings for a single provider, or null if not loaded yet. */
export const selectProviderSettings = (
  providerId: string
): ((state: AISettingsRootState) => ProviderSettings | null) =>
  createSelector(
    selectAllProviderSettings,
    (allSettings): ProviderSettings | null => allSettings[providerId] ?? null
  )

/**
 * Returns a full InferenceSettings object for the given provider, applying
 * field-level fallbacks from DEFAULT_INFERENCE_SETTINGS when a field is missing
 * from the persisted record.
 */
export const selectEffectiveInferenceSettings = (
  providerId: string
): ((state: AISettingsRootState) => InferenceSettings) =>
  createSelector(
    selectAllProviderSettings,
    (allSettings): InferenceSettings => {
      const provider = allSettings[providerId]
      if (!provider) {
        return { ...DEFAULT_INFERENCE_SETTINGS, providerId }
      }
      return {
        providerId,
        modelId: provider.selectedModel ?? DEFAULT_INFERENCE_SETTINGS.modelId,
        temperature: provider.temperature ?? DEFAULT_INFERENCE_SETTINGS.temperature,
        maxTokens: provider.maxTokens !== undefined
          ? provider.maxTokens
          : DEFAULT_INFERENCE_SETTINGS.maxTokens,
        reasoning: provider.reasoning ?? DEFAULT_INFERENCE_SETTINGS.reasoning
      }
    }
  )

/** Convenience: selected model ID for a provider. */
export const selectSelectedModel = (
  providerId: string
): ((state: AISettingsRootState) => string | null) =>
  createSelector(
    selectAllProviderSettings,
    (allSettings): string | null => allSettings[providerId]?.selectedModel ?? null
  )

/** Convenience: API token for a provider. */
export const selectApiToken = (
  providerId: string
): ((state: AISettingsRootState) => string | null) =>
  createSelector(
    selectAllProviderSettings,
    (allSettings): string | null => allSettings[providerId]?.apiToken ?? null
  )
