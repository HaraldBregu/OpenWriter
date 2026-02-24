import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScreenRecorder } from '../components/ScreenRecorder'
import { useLanguage } from '../hooks/useLanguage'

const ScreenPage: React.FC = () => {
  const { t } = useTranslation()
  useLanguage()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🖥️ {t('screen.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('screen.description')}
        </p>
      </div>

      <ScreenRecorder />
    </div>
  )
}

export default ScreenPage
