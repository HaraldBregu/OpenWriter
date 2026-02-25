import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { aiProviders } from '@/config/aiProviders'
import { useAISettings } from '@/hooks/useAISettings'

/**
 * ModelsSettings
 *
 * Displays model selection and API token inputs for each AI provider.
 * All persistence is handled by useAISettings — this component owns only
 * the token visibility toggle and the uncontrolled draft token input state.
 */
const ModelsSettings: React.FC = () => {
  const { t } = useTranslation()
  const { providerSettings, status, selectModel, updateApiToken } = useAISettings()

  // Local UI state: which providers are showing their token
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, false]))
  )

  // Draft tokens: controlled input value before the user blurs.
  // Initialized to empty strings; synced from Redux once status is 'ready'.
  const [draftTokens, setDraftTokens] = useState<Record<string, string>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, '']))
  )

  // Sync draft token state from Redux when settings load
  useEffect(() => {
    if (status !== 'ready') return
    setDraftTokens(
      Object.fromEntries(
        aiProviders.map((p) => [p.id, providerSettings[p.id]?.apiToken ?? ''])
      )
    )
  }, [status, providerSettings])

  const handleSelectModel = useCallback(
    (providerId: string, modelId: string) => {
      console.log(`[ModelsSettings] Selected model: provider=${providerId} model=${modelId}`)
      selectModel(providerId, modelId)
    },
    [selectModel]
  )

  const handleTokenChange = useCallback((providerId: string, token: string) => {
    setDraftTokens((prev) => ({ ...prev, [providerId]: token }))
  }, [])

  const handleTokenBlur = useCallback(
    (providerId: string) => {
      const token = draftTokens[providerId] ?? ''
      console.log(`[ModelsSettings] Token saved: provider=${providerId} token=${token ? '(set)' : '(cleared)'}`)
      updateApiToken(providerId, token)
    },
    [updateApiToken, draftTokens]
  )

  const toggleShowToken = useCallback((providerId: string) => {
    setShowTokens((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }, [])

  return (
    <div className="mx-auto w-full p-6 space-y-8">
      <div>
        <h1 className="text-lg font-normal">{t('settings.models.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.models.description')}</p>
      </div>

      {aiProviders.map((provider) => {
        const selectedModelId = providerSettings[provider.id]?.selectedModel ?? provider.models[0].id
        return (
          <section key={provider.id} className="space-y-3">
            <h2 className="text-sm font-normal text-muted-foreground">{provider.name}</h2>

            <div className="rounded-md border divide-y">
              {provider.models.map((model) => {
                const isSelected = selectedModelId === model.id
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelectModel(provider.id, model.id)}
                    className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${isSelected ? 'bg-muted/30' : ''}`}
                  >
                    <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors ${isSelected ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-normal">{model.name}</p>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                      {model.contextWindow} ctx
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="rounded-md border px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">{t('settings.models.apiKey')}</p>
                <input
                  type={showTokens[provider.id] ? 'text' : 'password'}
                  value={draftTokens[provider.id] ?? ''}
                  onChange={(e) => handleTokenChange(provider.id, e.target.value)}
                  onBlur={() => handleTokenBlur(provider.id)}
                  placeholder={t('settings.models.enterApiKey', { provider: provider.name })}
                  className="w-full bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <button
                type="button"
                onClick={() => toggleShowToken(provider.id)}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 select-none"
              >
                {showTokens[provider.id] ? t('settings.models.hide') : t('settings.models.show')}
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default ModelsSettings
