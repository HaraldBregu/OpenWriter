import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const WelcomePage: React.FC = () => {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const cleanup = window.api.onLanguageChange((lng: string) => {
      i18n.changeLanguage(lng)
    })
    return cleanup
  }, [i18n])

  useEffect(() => {
    const cleanup = window.api.onThemeChange((theme: string) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    })
    return cleanup
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
          {t('welcome')}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          {t('description')}
        </p>
        <div className="space-y-4">
          <div className="inline-block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('subtitle')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('focusMessage')}
            </p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => window.api.playSound()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              {t('clickMe')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
