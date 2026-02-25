import React, { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const MicrophonePage = lazy(() => import('../MicrophonePage'))
const CameraPage = lazy(() => import('../CameraPage'))
const ScreenPage = lazy(() => import('../ScreenPage'))

const MediaSettings: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="divide-y">
      <CollapsibleSection title={t('settings.sections.microphone')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <MicrophonePage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.camera')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <CameraPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.screen')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <ScreenPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default MediaSettings
