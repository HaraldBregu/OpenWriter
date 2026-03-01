// ---------------------------------------------------------------------------
// Shared AI Settings Types
// ---------------------------------------------------------------------------
// Imported by:
//   - src/main/services/store.ts          (via ../../shared/types/aiSettings)
//   - src/main/ipc/CustomIpc.ts           (via ../../shared/types/aiSettings)
//   - src/main/shared/validators.ts       (via ../../shared/types/aiSettings)
//   - src/preload/index.ts                (via ../shared/types/aiSettings)
//   - src/renderer/src/store/aiSettingsSlice.ts
//   - src/renderer/src/hooks/useAISettings.ts
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

/**
 * Per-provider settings record stored in settings.json.
 * Superset of the old ModelSettings interface -- adds inference defaults.
 */
export interface ProviderSettings {
  selectedModel: string
  apiToken: string
  temperature: number
  maxTokens: number | null
  reasoning: boolean
}

/**
 * Runtime inference settings object.
 * Passed to AI agents, stored in section configs, and snapshotted into
 * conversation metadata. Does NOT include apiToken.
 */
export interface InferenceSettings {
  providerId: string
  modelId: string
  temperature: number
  maxTokens: number | null
  reasoning: boolean
}

/**
 * Partial update payload for the store-set-inference-defaults IPC channel.
 * Only fields present in the object will be written to the store.
 */
export interface InferenceDefaultsUpdate {
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
}

/**
 * Hard-coded application-level defaults.
 * Used when no persisted value exists at any tier (store, section config).
 * Single source of truth -- replaces the duplicate definition in
 * PersonalitySettingsSheet.tsx and personality-files.ts.
 */
export const DEFAULT_INFERENCE_SETTINGS: InferenceSettings = {
  providerId: 'openai',
  modelId: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false
}

/**
 * Default values for the inference fields of a ProviderSettings record.
 * Used by migrateProviderSettings() when reading existing settings.json
 * entries that predate this schema version.
 */
export const DEFAULT_PROVIDER_INFERENCE: Pick<ProviderSettings, 'temperature' | 'maxTokens' | 'reasoning'> = {
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false
}
