import React, { lazy, Suspense } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { ThemeModeSelector } from './ThemeModeSelector'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const NotificationsPage = lazy(() => import('../NotificationsPage'))

const SystemSettings: React.FC = () => {
  return (
    <div className="divide-y">
      <CollapsibleSection title="Layout">
        <div className="divide-y">
          <div className="px-6 py-4">
            <p className="text-sm font-normal mb-1">Theme</p>
            <p className="text-xs text-muted-foreground mb-4">
              Choose how the application appearance is determined.
            </p>
            <div className="rounded-md border divide-y">
              <ThemeModeSelector />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Notifications">
        <Suspense fallback={<LoadingSkeleton />}>
          <NotificationsPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default SystemSettings
