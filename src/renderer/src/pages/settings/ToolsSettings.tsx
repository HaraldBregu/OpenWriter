import React, { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const LifecyclePage = lazy(() => import('../LifecyclePage'))
const WindowManagerPage = lazy(() => import('../WindowManagerPage'))
const FilesystemPage = lazy(() => import('../FilesystemPage'))
const DialogsPage = lazy(() => import('../DialogsPage'))
const ClipboardPage = lazy(() => import('../ClipboardPage'))

const ToolsSettings: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="divide-y">
      <CollapsibleSection title={t('settings.sections.lifecycle')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <LifecyclePage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.windows')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <WindowManagerPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.filesystem')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <FilesystemPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.dialogs')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <DialogsPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title={t('settings.sections.clipboard')}>
        <Suspense fallback={<LoadingSkeleton />}>
          <ClipboardPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default ToolsSettings
