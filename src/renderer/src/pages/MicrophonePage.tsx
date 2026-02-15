import React from 'react'
import { useTranslation } from 'react-i18next'
import { MicrophoneRecorder } from '../components/MicrophoneRecorder'
import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'

const MicrophonePage: React.FC = () => {
  const { t } = useTranslation()
  const { microphoneStatus, requestMicrophone } = useMediaPermissions()
  useTheme()
  useLanguage()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎤 {t('microphone.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('microphone.description')}
        </p>
      </div>

      {/* Permission Status */}
      {microphoneStatus !== 'granted' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                {t('microphone.permissionRequired')}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {t('microphone.status')}: <span className="font-mono">{microphoneStatus}</span>
              </p>
            </div>
            <button
              onClick={requestMicrophone}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
            >
              {t('microphone.grantPermission')}
            </button>
          </div>
        </div>
      )}

      <MicrophoneRecorder />
    </div>
  )
}

export default MicrophonePage
