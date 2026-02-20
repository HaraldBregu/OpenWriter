import React, { lazy, Suspense } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const CronPage = lazy(() => import('../CronPage'))
const LifecyclePage = lazy(() => import('../LifecyclePage'))
const WindowManagerPage = lazy(() => import('../WindowManagerPage'))
const FilesystemPage = lazy(() => import('../FilesystemPage'))
const DialogsPage = lazy(() => import('../DialogsPage'))
const ClipboardPage = lazy(() => import('../ClipboardPage'))

const ToolsSettings: React.FC = () => {
  return (
    <div className="divide-y">
      <CollapsibleSection title="Cron Jobs">
        <Suspense fallback={<LoadingSkeleton />}>
          <CronPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Lifecycle">
        <Suspense fallback={<LoadingSkeleton />}>
          <LifecyclePage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Windows">
        <Suspense fallback={<LoadingSkeleton />}>
          <WindowManagerPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Filesystem">
        <Suspense fallback={<LoadingSkeleton />}>
          <FilesystemPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Dialogs">
        <Suspense fallback={<LoadingSkeleton />}>
          <DialogsPage />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Clipboard">
        <Suspense fallback={<LoadingSkeleton />}>
          <ClipboardPage />
        </Suspense>
      </CollapsibleSection>
    </div>
  )
}

export default ToolsSettings
