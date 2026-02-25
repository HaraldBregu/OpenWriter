import React, { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import { ThemeModeSelector } from './ThemeModeSelector'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const NotificationsPage = lazy(() => import('../NotificationsPage'))

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

      <CollapsibleSection title={t('settings.sections.notifications')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <NotificationsPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default SystemSettings
