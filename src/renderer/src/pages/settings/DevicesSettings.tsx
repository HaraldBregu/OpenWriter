import React, { lazy, Suspense } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const BluetoothPage = lazy(() => import('../BluetoothPage'))
const NetworkPage = lazy(() => import('../NetworkPage'))

const DevicesSettings: React.FC = () => {
  return (
    <div className="divide-y">
      <CollapsibleSection title="Bluetooth">
        <Suspense fallback={<LoadingSkeleton />}>
          <BluetoothPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Network">
        <Suspense fallback={<LoadingSkeleton />}>
          <NetworkPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default DevicesSettings
