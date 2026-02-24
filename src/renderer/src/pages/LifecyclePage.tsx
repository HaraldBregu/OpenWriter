import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLifecycle } from '../hooks/useLifecycle'
import { useLanguage } from '../hooks/useLanguage'
import { Activity, RefreshCw, RotateCcw, Check, X, Clock } from 'lucide-react'

const eventColors: Record<string, string> = {
  'app-ready': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  'before-quit': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  'window-all-closed': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  'activate': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  'second-instance-blocked': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  'app-restarting': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
}

const LifecyclePage: React.FC = () => {
  const { t } = useTranslation()
  const { isSingleInstance, events, appReadyAt, platform, error, restart, refreshEvents } =
    useLifecycle()
  useLanguage()

  const [confirmRestart, setConfirmRestart] = useState(false)

  const handleRestart = async () => {
    if (!confirmRestart) {
      setConfirmRestart(true)
      setTimeout(() => setConfirmRestart(false), 3000)
      return
    }
    await restart()
  }

  const uptime =
    appReadyAt !== null ? Math.floor((Date.now() - appReadyAt) / 1000) : null

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const parts: string[] = []
    if (h > 0) parts.push(`${h}h`)
    if (m > 0) parts.push(`${m}m`)
    parts.push(`${s}s`)
    return parts.join(' ')
  }

  const sortedEvents = [...events].reverse()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('lifecycle.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('lifecycle.description')}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">{t('lifecycle.error')}</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Status Card */}
      <div
        className={`border rounded-lg p-6 ${
          isSingleInstance
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${
                isSingleInstance
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-red-100 dark:bg-red-900/40'
              }`}
            >
              {isSingleInstance ? (
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">
                {t('lifecycle.appStatus')}
              </p>
              <div className="text-sm space-y-1 mt-1">
                <p className="text-gray-600 dark:text-gray-400">
                  {t('lifecycle.platform')}{' '}
                  <span className="font-mono font-medium">{platform}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('lifecycle.singleInstance')}{' '}
                  <span
                    className={
                      isSingleInstance
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-red-600 dark:text-red-400 font-medium'
                    }
                  >
                    {isSingleInstance ? t('lifecycle.active') : t('lifecycle.inactive')}
                  </span>
                </p>
                {uptime !== null && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('lifecycle.uptime')}{' '}
                    <span className="font-mono font-medium">{formatUptime(uptime)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshEvents}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('lifecycle.refresh')}
            </button>
            <button
              onClick={handleRestart}
              className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                confirmRestart
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              {confirmRestart ? t('lifecycle.confirmRestart') : t('lifecycle.restart')}
            </button>
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('lifecycle.eventLog')}
        </h2>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('lifecycle.noEvents')}</p>
            </div>
          ) : (
            sortedEvents.map((event, idx) => (
              <div
                key={`${event.type}-${event.timestamp}-${idx}`}
                className="p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        eventColors[event.type] ||
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {event.type}
                    </span>
                    {event.detail && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {event.detail}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{t('lifecycle.note')}</strong> {t('lifecycle.lifecycleInfo')}
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>{t('lifecycle.feature1')}</li>
          <li>{t('lifecycle.feature2')}</li>
          <li>{t('lifecycle.feature3')}</li>
          <li>{t('lifecycle.feature4')}</li>
        </ul>
      </div>
    </div>
  )
}

export default LifecyclePage
