import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaPermissions } from '../../hooks/useMediaPermissions'

const statusLabel = (s: string, t: (key: string) => string) => {
  if (s === 'granted') return t('settings.permissions.granted')
  if (s === 'denied') return t('settings.permissions.denied')
  if (s === 'restricted') return t('settings.permissions.restricted')
  return t('settings.permissions.notDetermined')
}

const statusColor = (s: string) => {
  if (s === 'granted') return 'text-green-600 dark:text-green-400'
  if (s === 'denied') return 'text-red-600 dark:text-red-400'
  return 'text-yellow-600 dark:text-yellow-400'
}

const GeneralSettings: React.FC = () => {
  const { t } = useTranslation()
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null)
  const {
    microphoneStatus,
    cameraStatus,
    requestMicrophone,
    requestCamera,
    checkPermissionStatus
  } = useMediaPermissions()

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

      {/* Permissions */}
      <section className="space-y-3">
        <h2 className="text-sm font-normal text-muted-foreground">{t('settings.sections.permissions')}</h2>
        <div className="rounded-md border divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-normal">{t('settings.permissions.microphone')}</p>
              <p className={`text-xs ${statusColor(microphoneStatus)}`}>
                {statusLabel(microphoneStatus, t)}
              </p>
            </div>
            {microphoneStatus !== 'granted' && (
              <button
                onClick={requestMicrophone}
                className="text-xs font-normal px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('settings.permissions.request')}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-normal">{t('settings.permissions.camera')}</p>
              <p className={`text-xs ${statusColor(cameraStatus)}`}>
                {statusLabel(cameraStatus, t)}
              </p>
            </div>
            {cameraStatus !== 'granted' && (
              <button
                onClick={requestCamera}
                className="text-xs font-normal px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('settings.permissions.request')}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={checkPermissionStatus}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('settings.permissions.refreshStatus')}
        </button>
      </section>

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
