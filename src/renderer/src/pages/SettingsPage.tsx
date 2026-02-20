import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import MicrophonePage from './MicrophonePage'
import CameraPage from './CameraPage'
import ScreenPage from './ScreenPage'
import BluetoothPage from './BluetoothPage'
import NetworkPage from './NetworkPage'
import CronPage from './CronPage'
import LifecyclePage from './LifecyclePage'
import WindowManagerPage from './WindowManagerPage'
import FilesystemPage from './FilesystemPage'
import DialogsPage from './DialogsPage'
import ClipboardPage from './ClipboardPage'
import NotificationsPage from './NotificationsPage'

type Tab = 'general' | 'models' | 'media' | 'devices' | 'tools' | 'system'

const tabs: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'models', label: 'Models' },
  { id: 'media', label: 'Media' },
  { id: 'devices', label: 'Devices' },
  { id: 'tools', label: 'Tools' },
  { id: 'system', label: 'System' }
]

interface ModelOption {
  id: string
  name: string
  description: string
  contextWindow: string
}

interface AIProvider {
  id: string
  name: string
  models: ModelOption[]
}

const aiProviders: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Most capable, best for complex tasks', contextWindow: '200K' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Balanced performance and speed', contextWindow: '200K' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fastest, ideal for simple tasks', contextWindow: '200K' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable multimodal model', contextWindow: '128K' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast and affordable', contextWindow: '128K' },
      { id: 'o1', name: 'o1', description: 'Reasoning model for complex problems', contextWindow: '200K' },
      { id: 'o3-mini', name: 'o3-mini', description: 'Fast reasoning at lower cost', contextWindow: '200K' }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', description: 'Fast multimodal with low latency', contextWindow: '1M' },
      { id: 'gemini-2-0-pro', name: 'Gemini 2.0 Pro', description: 'Best quality for complex reasoning', contextWindow: '2M' },
      { id: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', description: 'Efficient for high-volume tasks', contextWindow: '1M' }
    ]
  },
  {
    id: 'meta',
    name: 'Meta',
    models: [
      { id: 'llama-3-3-70b', name: 'Llama 3.3 70B', description: 'Powerful open-weight model', contextWindow: '128K' },
      { id: 'llama-3-2-11b', name: 'Llama 3.2 11B', description: 'Multimodal, efficient inference', contextWindow: '128K' },
      { id: 'llama-3-1-8b', name: 'Llama 3.1 8B', description: 'Lightweight, fast local inference', contextWindow: '128K' }
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: [
      { id: 'mistral-large-2', name: 'Mistral Large 2', description: 'Top-tier reasoning and code', contextWindow: '128K' },
      { id: 'mistral-small-3', name: 'Mistral Small 3', description: 'Efficient for everyday tasks', contextWindow: '32K' },
      { id: 'codestral-latest', name: 'Codestral', description: 'Specialized for code generation', contextWindow: '256K' }
    ]
  }
]

const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, p.models[0].id]))
  )
  const [apiTokens, setApiTokens] = useState<Record<string, string>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, '']))
  )
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>(
    Object.fromEntries(aiProviders.map((p) => [p.id, false]))
  )
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null)

  const loadedFromStore = useRef(false)
  const prevSelectedModels = useRef<Record<string, string>>({})

  // Load persisted settings on mount
  useEffect(() => {
    window.api.storeGetAllModelSettings().then((stored) => {
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

    // Load current workspace
    window.api.workspaceGetCurrent().then((workspace) => {
      setCurrentWorkspace(workspace)
    }).catch(console.error)
  }, [])

  // Persist model selections to store whenever they change (skip initial/store-load updates)
  useEffect(() => {
    if (!loadedFromStore.current) return
    for (const [providerId, modelId] of Object.entries(selectedModels)) {
      if (prevSelectedModels.current[providerId] !== modelId) {
        window.api.storeSetSelectedModel(providerId, modelId).catch(console.error)
      }
    }
    prevSelectedModels.current = selectedModels
  }, [selectedModels])

  // Pure state-only handler — no IPC in the click path
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
    window.api.storeSetApiToken(providerId, token).catch(console.error)
  }, [])
  const {
    microphoneStatus,
    cameraStatus,
    requestMicrophone,
    requestCamera,
    checkPermissionStatus
  } = useMediaPermissions()
  useTheme()
  useLanguage()

  const statusLabel = (s: string) => {
    if (s === 'granted') return 'Granted'
    if (s === 'denied') return 'Denied'
    if (s === 'restricted') return 'Restricted'
    return 'Not determined'
  }

  const statusColor = (s: string) => {
    if (s === 'granted') return 'text-green-600 dark:text-green-400'
    if (s === 'denied') return 'text-red-600 dark:text-red-400'
    return 'text-yellow-600 dark:text-yellow-400'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b px-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-normal border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="mx-auto w-full p-6 space-y-8">
            <div>
              <h1 className="text-lg font-normal">{t('settings.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
            </div>

            {/* Permissions */}
            <section className="space-y-3">
              <h2 className="text-sm font-normal text-muted-foreground">Permissions</h2>
              <div className="rounded-md border divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-normal">Microphone</p>
                    <p className={`text-xs ${statusColor(microphoneStatus)}`}>
                      {statusLabel(microphoneStatus)}
                    </p>
                  </div>
                  {microphoneStatus !== 'granted' && (
                    <button
                      onClick={requestMicrophone}
                      className="text-xs font-normal px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Request
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-normal">Camera</p>
                    <p className={`text-xs ${statusColor(cameraStatus)}`}>
                      {statusLabel(cameraStatus)}
                    </p>
                  </div>
                  {cameraStatus !== 'granted' && (
                    <button
                      onClick={requestCamera}
                      className="text-xs font-normal px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Request
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={checkPermissionStatus}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Refresh status
              </button>
            </section>

            {/* Workspace */}
            <section className="space-y-3">
              <h2 className="text-sm font-normal text-muted-foreground">Workspace</h2>
              <div className="rounded-md border divide-y text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Current Workspace</span>
                  <span className="font-mono text-xs truncate max-w-md" title={currentWorkspace || 'Not set'}>
                    {currentWorkspace || 'Not set'}
                  </span>
                </div>
              </div>
            </section>

            {/* System */}
            <section className="space-y-3">
              <h2 className="text-sm font-normal text-muted-foreground">System</h2>
              <div className="rounded-md border divide-y text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-mono text-xs">{navigator.platform}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-mono text-xs">{navigator.language}</span>
                </div>
              </div>
            </section>

          </div>
        )}

        {activeTab === 'models' && (
          <div className="mx-auto w-full p-6 space-y-8">
            <div>
              <h1 className="text-lg font-normal">Models</h1>
              <p className="text-sm text-muted-foreground">Select the active model for each AI provider.</p>
            </div>

            {aiProviders.map((provider) => (
              <section key={provider.id} className="space-y-3">
                <h2 className="text-sm font-normal text-muted-foreground">{provider.name}</h2>

                {/* Model list */}
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

                {/* API token */}
                <div className="rounded-md border px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1.5">API Key</p>
                    <input
                      type={showTokens[provider.id] ? 'text' : 'password'}
                      value={apiTokens[provider.id]}
                      onChange={(e) => handleTokenChange(provider.id, e.target.value)}
                      onBlur={(e) => handleTokenBlur(provider.id, e.target.value)}
                      placeholder={`Enter ${provider.name} API key…`}
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
                    {showTokens[provider.id] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="divide-y">
            <Section title="Microphone">
              <MicrophonePage />
            </Section>
            <Section title="Camera">
              <CameraPage />
            </Section>
            <Section title="Screen">
              <ScreenPage />
            </Section>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="divide-y">
            <Section title="Bluetooth">
              <BluetoothPage />
            </Section>
            <Section title="Network">
              <NetworkPage />
            </Section>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="divide-y">
            <Section title="Cron Jobs">
              <CronPage />
            </Section>
            <Section title="Lifecycle">
              <LifecyclePage />
            </Section>
            <Section title="Windows">
              <WindowManagerPage />
            </Section>
            <Section title="Filesystem">
              <FilesystemPage />
            </Section>
            <Section title="Dialogs">
              <DialogsPage />
            </Section>
            <Section title="Clipboard">
              <ClipboardPage />
            </Section>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="divide-y">
            <Section title="Notifications">
              <NotificationsPage />
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-normal hover:bg-muted/40 transition-colors"
      >
        <span>{title}</span>
        <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  )
}

export default SettingsPage
