import React, { useCallback } from 'react'
import { Settings2 } from 'lucide-react'
import { AppButton } from '@/components/app/AppButton'
import {
  AppSheet,
  AppSheetTrigger,
  AppSheetContent,
  AppSheetHeader,
  AppSheetTitle,
  AppSheetDescription
} from '@/components/app/AppSheet'
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
  maxTokens: null,
  reasoning: false
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PersonalitySettingsSheetProps {
  settings: InferenceSettings
  onSettingsChange: (settings: InferenceSettings) => void
}

export const PersonalitySettingsSheet: React.FC<PersonalitySettingsSheetProps> = React.memo(({
  settings,
  onSettingsChange
}) => {
  const currentProvider = aiProviders.find((p) => p.id === settings.providerId)
  const models = currentProvider?.models ?? []
  const modelIsReasoning = isReasoningModel(settings.modelId)

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

  const handleTemperatureChange = useCallback((value: number) => {
    onSettingsChange({ ...settings, temperature: Math.round(value * 10) / 10 })
  }, [settings, onSettingsChange])

  const handleMaxTokensChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    <AppSheet>
      <AppSheetTrigger asChild>
        <AppButton variant="outline" size="icon" className="shrink-0 h-9 w-9">
          <Settings2 className="h-4 w-4" />
        </AppButton>
      </AppSheetTrigger>

      <AppSheetContent side="right" className="w-[340px] sm:max-w-[340px] overflow-y-auto">
        <AppSheetHeader>
          <AppSheetTitle>Inference Settings</AppSheetTitle>
          <AppSheetDescription>Configure the AI model and parameters for this page.</AppSheetDescription>
        </AppSheetHeader>

        <div className="mt-6 space-y-6">
          {/* Provider */}
          <div className="space-y-2">
            <AppLabel>Provider</AppLabel>
            <AppSelect value={settings.providerId} onValueChange={handleProviderChange}>
              <AppSelectTrigger className="w-full">
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
          <div className="space-y-2">
            <AppLabel>Model</AppLabel>
            <AppSelect value={settings.modelId} onValueChange={handleModelChange}>
              <AppSelectTrigger className="w-full">
                <AppSelectValue />
              </AppSelectTrigger>
              <AppSelectContent>
                {models.map((m) => (
                  <AppSelectItem key={m.id} value={m.id}>{m.name}</AppSelectItem>
                ))}
              </AppSelectContent>
            </AppSelect>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <AppLabel>Temperature</AppLabel>
              <span className="text-xs text-muted-foreground tabular-nums">
                {modelIsReasoning ? 'N/A' : settings.temperature.toFixed(1)}
              </span>
            </div>
            <AppSlider
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature}
              onValueChange={handleTemperatureChange}
              disabled={modelIsReasoning}
            />
            {modelIsReasoning && (
              <p className="text-xs text-muted-foreground">Temperature is not supported for reasoning models.</p>
            )}
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <AppLabel>Max Tokens</AppLabel>
            <AppInput
              type="number"
              min={0}
              placeholder="Unlimited"
              value={settings.maxTokens ?? ''}
              onChange={handleMaxTokensChange}
            />
            <p className="text-xs text-muted-foreground">Leave empty for unlimited.</p>
          </div>

          {/* Reasoning */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <AppLabel>Reasoning</AppLabel>
              <p className="text-xs text-muted-foreground">Enable extended thinking</p>
            </div>
            <AppSwitch
              checked={settings.reasoning}
              onCheckedChange={handleReasoningChange}
              disabled={!modelIsReasoning}
            />
          </div>
        </div>
      </AppSheetContent>
    </AppSheet>
  )
})

PersonalitySettingsSheet.displayName = 'PersonalitySettingsSheet'
