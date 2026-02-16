import React from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { useUpdate } from '../hooks/useUpdate'

const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    microphoneStatus,
    cameraStatus,
    requestMicrophone,
    requestCamera,
    checkPermissionStatus
  } = useMediaPermissions()
  useTheme()
  useLanguage()
  const {
    version,
    status,
    updateInfo,
    error: updateError,
    checkForUpdates,
    installUpdate
  } = useUpdate()

  const statusLabel = (s: string) => {
    if (s === 'granted') return 'Granted'
    if (s === 'denied') return 'Denied'
    if (s === 'restricted') return 'Restricted'
    return 'Not determined'
  }

  const statusColor = (s: string) => {
    if (s === 'granted') return 'text-green-600 dark:text-green-400'
    if (s === 'denied') return 'text-red-600 dark:text-red-400'
    return 'text-yellow-600 dark:text-yellow-400'
  }

  return (
    <div className="mx-auto w-full p-6 space-y-8">
      <div>
        <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
      </div>

      {/* Permissions */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Permissions</h2>

        <div className="rounded-md border divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Microphone</p>
              <p className={`text-xs ${statusColor(microphoneStatus)}`}>
                {statusLabel(microphoneStatus)}
              </p>
            </div>
            {microphoneStatus !== 'granted' && (
              <button
                onClick={requestMicrophone}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Request
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Camera</p>
              <p className={`text-xs ${statusColor(cameraStatus)}`}>
                {statusLabel(cameraStatus)}
              </p>
            </div>
            {cameraStatus !== 'granted' && (
              <button
                onClick={requestCamera}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Request
              </button>
            )}
          </div>
        </div>

        <button
          onClick={checkPermissionStatus}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh status
        </button>
      </section>

      {/* System */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">System</h2>

        <div className="rounded-md border divide-y text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-mono text-xs">{navigator.platform}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Language</span>
            <span className="font-mono text-xs">{navigator.language}</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">About</h2>

        <div className="rounded-md border divide-y text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono text-xs">{version || '...'}</span>
          </div>
        </div>

        <div className="space-y-2">
          {(status === 'idle' || status === 'not-available' || status === 'error') && (
            <div className="flex items-center gap-3">
              <button
                onClick={checkForUpdates}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Check for updates
              </button>
              {status === 'not-available' && (
                <span className="text-xs text-green-600 dark:text-green-400">Up to date</span>
              )}
            </div>
          )}

          {status === 'checking' && (
            <p className="text-xs text-muted-foreground">Checking...</p>
          )}

          {status === 'downloading' && (
            <p className="text-xs text-muted-foreground">Downloading update...</p>
          )}

          {status === 'downloaded' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 dark:text-green-400">
                {updateInfo ? `v${updateInfo.version} ready` : 'Update ready'}
              </span>
              <button
                onClick={installUpdate}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Install and restart
              </button>
            </div>
          )}

          {status === 'error' && updateError && (
            <p className="text-xs text-red-500 dark:text-red-400">{updateError}</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
