import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppSelect,
  AppSelectTrigger,
  AppSelectValue,
  AppSelectContent,
  AppSelectItem
} from '@/components/app/AppSelect'
import { AppLabel } from '@/components/app/AppLabel'
import { AppInput } from '@/components/app/AppInput'
import { AppSlider } from '@/components/app/AppSlider'
import { AppSwitch } from '@/components/app/AppSwitch'
import { aiProviders, isReasoningModel, getDefaultModelId } from '@/config/aiProviders'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InferenceSettings {
  providerId: string
  modelId: string
  temperature: number
  maxTokens: number | null
  reasoning: boolean
}

export const DEFAULT_INFERENCE_SETTINGS: InferenceSettings = {
  providerId: 'openai',
  modelId: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false
}

// ---------------------------------------------------------------------------
// Creativity level presets
// ---------------------------------------------------------------------------

type CreativityLevel = 'precise' | 'balanced' | 'creative' | 'very-creative' | 'imaginative' | 'custom'

interface CreativityPreset {
  value: CreativityLevel
  label: string
  temperature: number | null // null means custom
}

const CREATIVITY_PRESETS: CreativityPreset[] = [
  { value: 'precise',       label: 'Precise',       temperature: 0.2 },
  { value: 'balanced',      label: 'Balanced',       temperature: 0.5 },
  { value: 'creative',      label: 'Creative',       temperature: 0.8 },
  { value: 'very-creative', label: 'Very Creative',  temperature: 1.2 },
  { value: 'imaginative',   label: 'Imaginative',    temperature: 1.8 },
  { value: 'custom',        label: 'Custom',         temperature: null },
]

/** Map a numeric temperature to its closest preset label, or 'custom'. */
function temperatureToPreset(temp: number): CreativityLevel {
  for (const preset of CREATIVITY_PRESETS) {
    if (preset.temperature !== null && Math.abs(preset.temperature - temp) < 0.05) {
      return preset.value
    }
  }
  return 'custom'
}

// ---------------------------------------------------------------------------
// Text length presets
// ---------------------------------------------------------------------------

type TextLengthLevel = 'short' | 'medium' | 'long' | 'very-long' | 'unlimited' | 'custom'

interface TextLengthPreset {
  value: TextLengthLevel
  label: string
  maxTokens: number | null // null means unlimited; -1 means custom
}

const TEXT_LENGTH_PRESETS: TextLengthPreset[] = [
  { value: 'short',     label: 'Short (500 chars)',      maxTokens: 500 },
  { value: 'medium',    label: 'Medium (1000 chars)',    maxTokens: 1000 },
  { value: 'long',      label: 'Long (2000 chars)',      maxTokens: 2000 },
  { value: 'very-long', label: 'Very Long (4000 chars)', maxTokens: 4000 },
  { value: 'unlimited', label: 'Unlimited',              maxTokens: null },
  { value: 'custom',    label: 'Custom',                 maxTokens: -1 },
]

/** Map a maxTokens value to its closest preset label, or 'custom'. */
function maxTokensToPreset(maxTokens: number | null): TextLengthLevel {
  if (maxTokens === null) return 'unlimited'
  for (const preset of TEXT_LENGTH_PRESETS) {
    if (preset.maxTokens !== null && preset.maxTokens !== -1 && preset.maxTokens === maxTokens) {
      return preset.value
    }
  }
  return 'custom'
}

// ---------------------------------------------------------------------------
// Component — inline sidebar panel (no overlay)
// ---------------------------------------------------------------------------

interface PersonalitySettingsPanelProps {
  settings: InferenceSettings
  onSettingsChange: (settings: InferenceSettings) => void
}

export const PersonalitySettingsPanel: React.FC<PersonalitySettingsPanelProps> = React.memo(({
  settings,
  onSettingsChange
}) => {
  const { t } = useTranslation()
  const currentProvider = aiProviders.find((p) => p.id === settings.providerId)
  const hasProvider = !!currentProvider
  const models = currentProvider?.models ?? []
  const hasModel = hasProvider && models.some((m) => m.id === settings.modelId)
  const modelIsReasoning = isReasoningModel(settings.modelId)

  // Local UI state for the creativity level dropdown
  const [creativityLevel, setCreativityLevel] = useState<CreativityLevel>(
    () => temperatureToPreset(settings.temperature)
  )

  // Local UI state for the text length dropdown
  const [textLengthLevel, setTextLengthLevel] = useState<TextLengthLevel>(
    () => maxTokensToPreset(settings.maxTokens)
  )

  const handleProviderChange = useCallback((providerId: string) => {
    const defaultModel = getDefaultModelId(providerId)
    const isReasoning = isReasoningModel(defaultModel)
    onSettingsChange({
      ...settings,
      providerId,
      modelId: defaultModel,
      reasoning: isReasoning ? settings.reasoning : false
    })
  }, [settings, onSettingsChange])

  const handleModelChange = useCallback((modelId: string) => {
    const isReasoning = isReasoningModel(modelId)
    onSettingsChange({
      ...settings,
      modelId,
      reasoning: isReasoning ? settings.reasoning : false
    })
  }, [settings, onSettingsChange])

  const handleCreativityLevelChange = useCallback((level: string) => {
    const typed = level as CreativityLevel
    setCreativityLevel(typed)
    const preset = CREATIVITY_PRESETS.find((p) => p.value === typed)
    if (preset && preset.temperature !== null) {
      onSettingsChange({ ...settings, temperature: preset.temperature })
    }
    // 'custom' keeps the current temperature value; user adjusts via slider
  }, [settings, onSettingsChange])

  const handleTemperatureChange = useCallback((value: number) => {
    const rounded = Math.round(value * 10) / 10
    onSettingsChange({ ...settings, temperature: rounded })
    setCreativityLevel(temperatureToPreset(rounded))
  }, [settings, onSettingsChange])

  const handleTextLengthLevelChange = useCallback((level: string) => {
    const typed = level as TextLengthLevel
    setTextLengthLevel(typed)
    const preset = TEXT_LENGTH_PRESETS.find((p) => p.value === typed)
    if (preset && preset.maxTokens !== -1) {
      // null means unlimited, a real number means capped
      onSettingsChange({ ...settings, maxTokens: preset.maxTokens })
    }
    // 'custom' keeps the current maxTokens value; user adjusts via number input
  }, [settings, onSettingsChange])

  const handleCustomMaxTokensChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim()
    if (raw === '') {
      onSettingsChange({ ...settings, maxTokens: null })
    } else {
      const parsed = parseInt(raw, 10)
      if (!isNaN(parsed) && parsed >= 0) {
        onSettingsChange({ ...settings, maxTokens: parsed })
      }
    }
  }, [settings, onSettingsChange])

  const handleReasoningChange = useCallback((checked: boolean) => {
    onSettingsChange({ ...settings, reasoning: checked })
  }, [settings, onSettingsChange])

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-l border-border bg-background overflow-y-auto">
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-semibold">{t('inferenceSettings.title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t('inferenceSettings.description')}</p>
      </div>

      <div className="p-4 space-y-5">
        {/* Provider */}
        <div className="space-y-1.5">
          <AppLabel className="text-xs">{t('inferenceSettings.provider')}</AppLabel>
          <AppSelect value={settings.providerId} onValueChange={handleProviderChange}>
            <AppSelectTrigger className="w-full h-8 text-xs">
              <AppSelectValue />
            </AppSelectTrigger>
            <AppSelectContent>
              {aiProviders.map((p) => (
                <AppSelectItem key={p.id} value={p.id}>{p.name}</AppSelectItem>
              ))}
            </AppSelectContent>
          </AppSelect>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <AppLabel className="text-xs">{t('inferenceSettings.model')}</AppLabel>
          <AppSelect value={settings.modelId} onValueChange={handleModelChange} disabled={!hasProvider}>
            <AppSelectTrigger className="w-full h-8 text-xs">
              <AppSelectValue />
            </AppSelectTrigger>
            <AppSelectContent>
              {models.map((m) => (
                <AppSelectItem key={m.id} value={m.id}>{m.name}</AppSelectItem>
              ))}
            </AppSelectContent>
          </AppSelect>
        </div>

        {/* Creativity Level (replaces Temperature) */}
        <div className="space-y-1.5">
          <AppLabel className="text-xs">{t('inferenceSettings.creativityLevel')}</AppLabel>
          <AppSelect
            value={creativityLevel}
            onValueChange={handleCreativityLevelChange}
            disabled={!hasModel || modelIsReasoning}
          >
            <AppSelectTrigger className="w-full h-8 text-xs">
              <AppSelectValue />
            </AppSelectTrigger>
            <AppSelectContent>
              {CREATIVITY_PRESETS.map((preset) => (
                <AppSelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </AppSelectItem>
              ))}
            </AppSelectContent>
          </AppSelect>
          {hasModel && modelIsReasoning && (
            <p className="text-[11px] text-muted-foreground">{t('inferenceSettings.notSupportedReasoning')}</p>
          )}
          {creativityLevel === 'custom' && hasModel && !modelIsReasoning && (
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{t('inferenceSettings.customValue')}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {settings.temperature.toFixed(1)}
                </span>
              </div>
              <AppSlider
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature}
                onValueChange={handleTemperatureChange}
              />
            </div>
          )}
        </div>

        {/* Text Length (replaces Max Tokens) */}
        <div className="space-y-1.5">
          <AppLabel className="text-xs">{t('inferenceSettings.textLength')}</AppLabel>
          <AppSelect value={textLengthLevel} onValueChange={handleTextLengthLevelChange} disabled={!hasModel}>
            <AppSelectTrigger className="w-full h-8 text-xs">
              <AppSelectValue />
            </AppSelectTrigger>
            <AppSelectContent>
              {TEXT_LENGTH_PRESETS.map((preset) => (
                <AppSelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </AppSelectItem>
              ))}
            </AppSelectContent>
          </AppSelect>
          {textLengthLevel === 'custom' && hasModel && (
            <div className="pt-1">
              <AppInput
                type="number"
                min={0}
                placeholder={t('inferenceSettings.enterCharacterLimit')}
                value={settings.maxTokens ?? ''}
                onChange={handleCustomMaxTokensChange}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <AppLabel className="text-xs">Reasoning</AppLabel>
            <p className="text-[11px] text-muted-foreground">Extended thinking</p>
          </div>
          <AppSwitch
            checked={settings.reasoning}
            onCheckedChange={handleReasoningChange}
            disabled={!hasModel || !modelIsReasoning}
          />
        </div>
      </div>
    </div>
  )
})

PersonalitySettingsPanel.displayName = 'PersonalitySettingsPanel'
