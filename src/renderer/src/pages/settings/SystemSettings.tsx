import React from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import { ThemeModeSelector } from './ThemeModeSelector'

const SystemSettings: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="divide-y">
      <CollapsibleSection title={t('settings.sections.layout')}>
        <div className="divide-y">
          <div className="px-6 py-4">
            <p className="text-sm font-normal mb-1">{t('settings.theme.title')}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {t('settings.theme.description')}
            </p>
            <div className="rounded-md border divide-y">
              <ThemeModeSelector />
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}

export default SystemSettings
