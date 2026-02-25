import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { aiProviders } from '@/config/aiProviders'

const ModelsSettings: React.FC = () => {
  const { t } = useTranslation()
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, p.models[0].id]))
  )
  const [apiTokens, setApiTokens] = useState<Record<string, string>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, '']))
  )
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, false]))
  )

  const loadedFromStore = useRef(false)
  const prevSelectedModels = useRef<Record<string, string>>({})

  useEffect(() => {
    window.store.getAllModelSettings().then((stored) => {
      if (!stored) return
      setSelectedModels((prev) => {
        const next = { ...prev }
        for (const [id, s] of Object.entries(stored)) {
          if (s.selectedModel) next[id] = s.selectedModel
        }
        prevSelectedModels.current = next
        loadedFromStore.current = true
        return next
      })
      setApiTokens((prev) => {
        const next = { ...prev }
        for (const [id, s] of Object.entries(stored)) {
          next[id] = s.apiToken ?? ''
        }
        return next
      })
    })
  }, [])

  useEffect(() => {
    if (!loadedFromStore.current) return
    for (const [providerId, modelId] of Object.entries(selectedModels)) {
      if (prevSelectedModels.current[providerId] !== modelId) {
        window.store.setSelectedModel(providerId, modelId).catch(console.error)
      }
    }
    prevSelectedModels.current = selectedModels
  }, [selectedModels])

  const handleSelectModel = useCallback((providerId: string, modelId: string) => {
    console.log(`[Models] Selected model: provider=${providerId} model=${modelId}`)
    loadedFromStore.current = true
    setSelectedModels((prev) => ({ ...prev, [providerId]: modelId }))
  }, [])

  const handleTokenChange = useCallback((providerId: string, token: string) => {
    setApiTokens((prev) => ({ ...prev, [providerId]: token }))
  }, [])

  const handleTokenBlur = useCallback((providerId: string, token: string) => {
    console.log(`[Models] Token saved: provider=${providerId} token=${token ? '(set)' : '(cleared)'}`)
    window.store.setApiToken(providerId, token).catch(console.error)
  }, [])

  return (
    <div className="mx-auto w-full p-6 space-y-8">
      <div>
        <h1 className="text-lg font-normal">{t('settings.models.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.models.description')}</p>
      </div>

      {aiProviders.map((provider) => (
        <section key={provider.id} className="space-y-3">
          <h2 className="text-sm font-normal text-muted-foreground">{provider.name}</h2>

          <div className="rounded-md border divide-y">
            {provider.models.map((model) => {
              const isSelected = selectedModels[provider.id] === model.id
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
                value={apiTokens[provider.id]}
                onChange={(e) => handleTokenChange(provider.id, e.target.value)}
                onBlur={(e) => handleTokenBlur(provider.id, e.target.value)}
                placeholder={t('settings.models.enterApiKey', { provider: provider.name })}
                className="w-full bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground/40"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setShowTokens((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
              }
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 select-none"
            >
              {showTokens[provider.id] ? t('settings.models.hide') : t('settings.models.show')}
            </button>
          </div>
        </section>
      ))}
    </div>
  )
}

export default ModelsSettings
