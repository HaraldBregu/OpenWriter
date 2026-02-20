import React, { useState, lazy, Suspense } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

const GeneralSettings = lazy(() => import('./settings/GeneralSettings'))
const ModelsSettings = lazy(() => import('./settings/ModelsSettings'))
const MediaSettings = lazy(() => import('./settings/MediaSettings'))
const DevicesSettings = lazy(() => import('./settings/DevicesSettings'))
const ToolsSettings = lazy(() => import('./settings/ToolsSettings'))
const SystemSettings = lazy(() => import('./settings/SystemSettings'))

type Tab = 'general' | 'models' | 'media' | 'devices' | 'tools' | 'system'

const tabs: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'models', label: 'Models' },
  { id: 'media', label: 'Media' },
  { id: 'devices', label: 'Devices' },
  { id: 'tools', label: 'Tools' },
  { id: 'system', label: 'System' }
]

const tabComponents: Record<Tab, React.LazyExoticComponent<React.FC>> = {
  general: GeneralSettings,
  models: ModelsSettings,
  media: MediaSettings,
  devices: DevicesSettings,
  tools: ToolsSettings,
  system: SystemSettings
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  useTheme()
  useLanguage()

  const ActiveComponent = tabComponents[activeTab]

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
        <Suspense fallback={<LoadingSkeleton />}>
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  )
}

export default SettingsPage
