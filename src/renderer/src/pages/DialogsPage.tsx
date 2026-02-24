import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDialogs } from '../hooks/useDialogs'
import { useLanguage } from '../hooks/useLanguage'
import {
  MessageSquare,
  FolderOpen,
  Save,
  AlertTriangle,
  Info,
  Trash2,
  ClipboardList
} from 'lucide-react'

const typeColors: Record<string, string> = {
  open: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  save: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  message: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  error: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
}

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  open: FolderOpen,
  save: Save,
  message: Info,
  error: AlertTriangle
}

function formatData(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`
      }
      return `${key}: ${value}`
    })
    .join(' | ')
}

const DialogsPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    log,
    error,
    showOpenDialog,
    showSaveDialog,
    showMessageBox,
    showErrorDialog,
    clearLog
  } = useDialogs()
  useLanguage()

  const dialogButtons = [
    {
      key: 'open',
      label: t('dialogs.openDialog'),
      description: t('dialogs.openDesc'),
      icon: FolderOpen,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => showOpenDialog()
    },
    {
      key: 'save',
      label: t('dialogs.saveDialog'),
      description: t('dialogs.saveDesc'),
      icon: Save,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => showSaveDialog()
    },
    {
      key: 'message',
      label: t('dialogs.messageBox'),
      description: t('dialogs.messageDesc'),
      icon: Info,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () =>
        showMessageBox(
          'Sample Message',
          'This is a demonstration of Electron\'s message box dialog with multiple buttons.',
          ['OK', 'Cancel', 'Retry']
        )
    },
    {
      key: 'error',
      label: t('dialogs.errorDialog'),
      description: t('dialogs.errorDesc'),
      icon: AlertTriangle,
      color: 'bg-red-500 hover:bg-red-600',
      action: () =>
        showErrorDialog(
          'Sample Error',
          'This is a demonstration of Electron\'s error dialog. It is a blocking, system-level alert.'
        )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('dialogs.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dialogs.description')}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">{t('dialogs.error')}</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Dialog Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dialogButtons.map((btn) => (
          <div
            key={btn.key}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${typeColors[btn.key]}`}>
                  <btn.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{btn.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{btn.description}</p>
                </div>
              </div>
              <button
                onClick={btn.action}
                className={`px-4 py-2 ${btn.color} text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-sm shrink-0`}
              >
                <btn.icon className="h-4 w-4" />
                {t('dialogs.show')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Result Log Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t('dialogs.resultLog')}
            {log.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-full">
                {log.length}
              </span>
            )}
          </h2>
          {log.length > 0 && (
            <button
              onClick={clearLog}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              {t('dialogs.clear')}
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('dialogs.noResults')}</p>
              <p className="text-sm mt-2">{t('dialogs.noResultsHint')}</p>
            </div>
          ) : (
            log.map((entry, idx) => {
              const TypeIcon = typeIcons[entry.type] || Info
              return (
                <div
                  key={`${entry.timestamp}-${idx}`}
                  className="p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-1.5 rounded ${typeColors[entry.type] || 'bg-gray-100 dark:bg-gray-700'}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              typeColors[entry.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                          {formatData(entry.data)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
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
          <strong>{t('dialogs.note')}</strong> {t('dialogs.dialogInfo')}
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>{t('dialogs.feature1')}</li>
          <li>{t('dialogs.feature2')}</li>
          <li>{t('dialogs.feature3')}</li>
          <li>{t('dialogs.feature4')}</li>
        </ul>
      </div>
    </div>
  )
}

export default DialogsPage
