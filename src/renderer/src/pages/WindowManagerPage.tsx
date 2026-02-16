import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWindowManager } from '../hooks/useWindowManager'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import {
  AppWindow,
  Plus,
  X,
  XCircle,
  RefreshCw,
  Layers,
  Square,
  PanelTop,
  Pin
} from 'lucide-react'

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  child: Layers,
  modal: Square,
  frameless: PanelTop,
  widget: Pin
}

const typeColors: Record<string, string> = {
  child: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  modal: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  frameless: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  widget: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
}

const WindowManagerPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    windows,
    error,
    createChild,
    createModal,
    createFrameless,
    createWidget,
    closeWindow,
    closeAll,
    refresh
  } = useWindowManager()
  useTheme()
  useLanguage()

  const windowTypes = [
    {
      key: 'child',
      label: t('windowManager.childWindow'),
      description: t('windowManager.childDesc'),
      icon: Layers,
      action: createChild,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      key: 'modal',
      label: t('windowManager.modalWindow'),
      description: t('windowManager.modalDesc'),
      icon: Square,
      action: createModal,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      key: 'frameless',
      label: t('windowManager.framelessWindow'),
      description: t('windowManager.framelessDesc'),
      icon: PanelTop,
      action: createFrameless,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      key: 'widget',
      label: t('windowManager.widgetWindow'),
      description: t('windowManager.widgetDesc'),
      icon: Pin,
      action: createWidget,
      color: 'bg-green-500 hover:bg-green-600'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('windowManager.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('windowManager.description')}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">{t('windowManager.error')}</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Create Window Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {windowTypes.map((wt) => (
          <div
            key={wt.key}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${typeColors[wt.key] || 'bg-gray-100 dark:bg-gray-700'}`}>
                  <wt.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{wt.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{wt.description}</p>
                </div>
              </div>
              <button
                onClick={wt.action}
                className={`px-3 py-2 ${wt.color} text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-sm`}
              >
                <Plus className="h-4 w-4" />
                {t('windowManager.open')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Open Windows Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AppWindow className="h-5 w-5" />
            {t('windowManager.openWindows')}
            {windows.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-full">
                {windows.length}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              {t('windowManager.refresh')}
            </button>
            {windows.length > 0 && (
              <button
                onClick={closeAll}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              >
                <XCircle className="h-4 w-4" />
                {t('windowManager.closeAll')}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {windows.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <AppWindow className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('windowManager.noWindows')}</p>
              <p className="text-sm mt-2">{t('windowManager.noWindowsHint')}</p>
            </div>
          ) : (
            windows.map((win) => {
              const TypeIcon = typeIcons[win.type] || AppWindow
              return (
                <div
                  key={win.id}
                  className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeColors[win.type] || 'bg-gray-100 dark:bg-gray-700'}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">{win.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span>ID: {win.id}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                              typeColors[win.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {win.type}
                          </span>
                          <span>{new Date(win.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => closeWindow(win.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t('windowManager.close')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{t('windowManager.note')}</strong> {t('windowManager.windowInfo')}
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>{t('windowManager.feature1')}</li>
          <li>{t('windowManager.feature2')}</li>
          <li>{t('windowManager.feature3')}</li>
          <li>{t('windowManager.feature4')}</li>
          <li>{t('windowManager.feature5')}</li>
        </ul>
      </div>
    </div>
  )
}

export default WindowManagerPage
