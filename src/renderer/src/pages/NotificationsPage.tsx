import React, { useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { useLanguage } from '../hooks/useLanguage'
import {
  Bell,
  BellRing,
  Info,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ClipboardList,
  AlertCircle,
  Zap
} from 'lucide-react'

const actionColors: Record<string, string> = {
  shown: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  clicked: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  closed: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300'
}

const actionIcons: Record<string, React.FC<{ className?: string }>> = {
  shown: Bell,
  clicked: CheckCircle2,
  closed: AlertCircle
}

const NotificationsPage: React.FC = () => {
  const { isSupported, log, error, showNotification, clearLog } = useNotifications()
  const [customTitle, setCustomTitle] = useState('Test Notification')
  const [customBody, setCustomBody] = useState('This is a test notification message')
  const [urgency, setUrgency] = useState<'normal' | 'critical' | 'low'>('normal')
  const [silent, setSilent] = useState(false)
  useLanguage()

  const presetNotifications = [
    {
      key: 'info',
      label: 'Info Notification',
      description: 'A standard informational notification',
      icon: Info,
      color: 'bg-blue-500 hover:bg-blue-600',
      options: {
        title: 'Information',
        body: 'This is an informational notification from Tesseract AI.',
        urgency: 'normal' as const
      }
    },
    {
      key: 'success',
      label: 'Success Notification',
      description: 'A success confirmation notification',
      icon: CheckCircle2,
      color: 'bg-green-500 hover:bg-green-600',
      options: {
        title: 'Success!',
        body: 'Your operation completed successfully.',
        urgency: 'normal' as const
      }
    },
    {
      key: 'warning',
      label: 'Warning Notification',
      description: 'An important warning notification',
      icon: AlertTriangle,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      options: {
        title: 'Warning',
        body: 'Please check your settings before continuing.',
        urgency: 'normal' as const
      }
    },
    {
      key: 'critical',
      label: 'Critical Notification',
      description: 'A high-priority critical alert',
      icon: Zap,
      color: 'bg-red-500 hover:bg-red-600',
      options: {
        title: 'Critical Alert!',
        body: 'Immediate attention required. System status critical.',
        urgency: 'critical' as const
      }
    }
  ]

  const handleCustomNotification = async (): Promise<void> => {
    await showNotification({
      title: customTitle,
      body: customBody,
      silent,
      urgency
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Notifications</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test native system notifications with custom content and click handlers
        </p>
      </div>

      {/* Support Status */}
      <div
        className={`border rounded-lg p-4 ${
          isSupported
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {isSupported ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-300 font-semibold">
                Notifications are supported on this platform
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-300 font-semibold">
                Notifications are not supported on this platform
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">Error</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Preset Notifications Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Preset Notifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presetNotifications.map((preset) => (
            <div
              key={preset.key}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${actionColors.shown}`}>
                    <preset.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{preset.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {preset.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => showNotification(preset.options)}
                  disabled={!isSupported}
                  className={`px-4 py-2 ${preset.color} text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <BellRing className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Notification Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Custom Notification</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Body</label>
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Notification message"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as 'normal' | 'critical' | 'low')}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={silent}
                  onChange={(e) => setSilent(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Silent notification</span>
              </label>
            </div>
          </div>
          <button
            onClick={handleCustomNotification}
            disabled={!isSupported || !customTitle || !customBody}
            className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BellRing className="h-5 w-5" />
            Send Custom Notification
          </button>
        </div>
      </div>

      {/* Event Log Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Notification Events
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
              Clear
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No notification events yet</p>
              <p className="text-sm mt-2">Send a notification to see events appear here</p>
            </div>
          ) : (
            log.map((entry, idx) => {
              const ActionIcon = actionIcons[entry.action] || Bell
              return (
                <div
                  key={`${entry.timestamp}-${idx}`}
                  className="p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`p-1.5 rounded ${actionColors[entry.action] || 'bg-gray-100 dark:bg-gray-700'}`}
                      >
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              actionColors[entry.action] ||
                              'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {entry.action}
                          </span>
                          <span className="font-semibold text-sm">{entry.title}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{entry.body}</p>
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
          <strong>Note:</strong> System notifications demonstrate Electron&apos;s native notification API.
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>Notifications include the app icon automatically</li>
          <li>Clicking a notification brings the app to focus</li>
          <li>All notification events (shown, clicked, closed) are tracked</li>
          <li>Supports different urgency levels and silent mode</li>
        </ul>
      </div>
    </div>
  )
}

export default NotificationsPage
