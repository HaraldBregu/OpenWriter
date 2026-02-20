import React, { lazy, Suspense } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const NotificationsPage = lazy(() => import('../NotificationsPage'))

const SystemSettings: React.FC = () => {
  return (
    <div className="divide-y">
      <CollapsibleSection title="Notifications">
        <Suspense fallback={<LoadingSkeleton />}>
          <NotificationsPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default SystemSettings
