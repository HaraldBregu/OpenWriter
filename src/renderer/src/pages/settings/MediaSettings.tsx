import React, { lazy, Suspense } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const MicrophonePage = lazy(() => import('../MicrophonePage'))
const CameraPage = lazy(() => import('../CameraPage'))
const ScreenPage = lazy(() => import('../ScreenPage'))

const MediaSettings: React.FC = () => {
  return (
    <div className="divide-y">
      <CollapsibleSection title="Microphone">
        <Suspense fallback={<LoadingSkeleton />}>
          <MicrophonePage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Camera">
        <Suspense fallback={<LoadingSkeleton />}>
          <CameraPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Screen">
        <Suspense fallback={<LoadingSkeleton />}>
          <ScreenPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default MediaSettings
