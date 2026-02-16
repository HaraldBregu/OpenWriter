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

  const getStatusBadge = (status: string) => {
    const colors = {
      granted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'not-determined': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      restricted: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    }
    return colors[status as keyof typeof colors] || colors['not-determined']
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">⚙️ {t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.description')}
        </p>
      </div>

      {/* Permissions Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Media Permissions</h2>

        <div className="space-y-4">
          {/* Microphone Permission */}
          <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🎤</div>
              <div>
                <p className="font-medium">Microphone</p>
                <span className={`text-sm px-2 py-1 rounded ${getStatusBadge(microphoneStatus)}`}>
                  {microphoneStatus}
                </span>
              </div>
            </div>
            <button
              onClick={requestMicrophone}
              disabled={microphoneStatus === 'granted'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                microphoneStatus === 'granted'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              }`}
            >
              {microphoneStatus === 'granted' ? 'Granted' : 'Request Access'}
            </button>
          </div>

          {/* Camera Permission */}
          <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">📷</div>
              <div>
                <p className="font-medium">Camera</p>
                <span className={`text-sm px-2 py-1 rounded ${getStatusBadge(cameraStatus)}`}>
                  {cameraStatus}
                </span>
              </div>
            </div>
            <button
              onClick={requestCamera}
              disabled={cameraStatus === 'granted'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                cameraStatus === 'granted'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              }`}
            >
              {cameraStatus === 'granted' ? 'Granted' : 'Request Access'}
            </button>
          </div>
        </div>

        <button
          onClick={checkPermissionStatus}
          className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          Refresh Status
        </button>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">System Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Platform:</span>
            <span className="font-mono">{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">User Agent:</span>
            <span className="font-mono text-xs">{navigator.userAgent.slice(0, 50)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Language:</span>
            <span className="font-mono">{navigator.language}</span>
          </div>
        </div>
      </div>

      {/* About & Updates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Tesseract Media Recorder
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          Version {version || '...'}
        </p>

        <div className="space-y-3">
          {/* Check for updates */}
          {(status === 'idle' || status === 'not-available' || status === 'error') && (
            <div className="flex items-center gap-3">
              <button
                onClick={checkForUpdates}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                Check for Updates
              </button>
              {status === 'not-available' && (
                <span className="text-sm text-green-600 dark:text-green-400">You&apos;re up to date!</span>
              )}
            </div>
          )}

          {/* Checking spinner */}
          {status === 'checking' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Checking for updates...</p>
          )}

          {/* Downloading */}
          {status === 'downloading' && (
            <p className="text-sm text-blue-600 dark:text-blue-400">Downloading update...</p>
          )}

          {/* Ready to install */}
          {status === 'downloaded' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600 dark:text-green-400">
                {updateInfo ? `Version ${updateInfo.version} ready` : 'Update downloaded'}
              </span>
              <button
                onClick={installUpdate}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 active:bg-green-700 transition-colors"
              >
                Install and Restart
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && updateError && (
            <p className="text-sm text-red-500 dark:text-red-400">
              Update error: {updateError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
