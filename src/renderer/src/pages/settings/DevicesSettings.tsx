import React, { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const BluetoothPage = lazy(() => import('../BluetoothPage'))
const NetworkPage = lazy(() => import('../NetworkPage'))

const DevicesSettings: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="divide-y">
      <CollapsibleSection title={t('settings.sections.bluetooth')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <BluetoothPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.network')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <NetworkPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default DevicesSettings
