import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const GeneralSettings: React.FC = () => {
  const { t } = useTranslation()
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null)

  useEffect(() => {
    window.workspace.getCurrent().then((workspace) => {
      setCurrentWorkspace(workspace)
    }).catch(console.error)
  }, [])

  return (
    <div className="mx-auto w-full p-6 space-y-8">
      <div>
        <h1 className="text-lg font-normal">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
      </div>

      {/* Workspace */}
      <section className="space-y-3">
        <h2 className="text-sm font-normal text-muted-foreground">{t('settings.sections.workspace')}</h2>
        <div className="rounded-md border divide-y text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">{t('settings.workspace.currentWorkspace')}</span>
            <span className="font-mono text-xs truncate max-w-md" title={currentWorkspace || t('settings.workspace.notSet')}>
              {currentWorkspace || t('settings.workspace.notSet')}
            </span>
          </div>
        </div>
      </section>

      {/* System */}
      <section className="space-y-3">
        <h2 className="text-sm font-normal text-muted-foreground">{t('settings.sections.system')}</h2>
        <div className="rounded-md border divide-y text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">{t('settings.systemInfo.platform')}</span>
            <span className="font-mono text-xs">{navigator.platform}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">{t('settings.systemInfo.language')}</span>
            <span className="font-mono text-xs">{navigator.language}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default GeneralSettings
