import React from 'react'
import { useTranslation } from 'react-i18next'
import { CameraRecorder } from '../components/CameraRecorder'
import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'

const CameraPage: React.FC = () => {
  const { t } = useTranslation()
  const { cameraStatus, requestCamera } = useMediaPermissions()
  useTheme()
  useLanguage()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">📹 {t('camera.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('camera.description')}
        </p>
      </div>

      {/* Permission Status */}
      {cameraStatus !== 'granted' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                {t('camera.permissionRequired')}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {t('camera.status')}: <span className="font-mono">{cameraStatus}</span>
              </p>
            </div>
            <button
              onClick={requestCamera}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
            >
              {t('camera.grantPermission')}
            </button>
          </div>
        </div>
      )}

      <CameraRecorder />
    </div>
  )
}

export default CameraPage
