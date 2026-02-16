import React from 'react'
import { useUpdateSimulator } from '../hooks/useUpdateSimulator'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  HardDrive,
  Zap,
  RotateCw,
  X,
  FileText,
  Loader2
} from 'lucide-react'

const UpdateSimulatorPage: React.FC = () => {
  const { state, checkForUpdates, downloadUpdate, installAndRestart, cancelDownload, reset } =
    useUpdateSimulator()
  useTheme()
  useLanguage()

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'checking':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
      case 'available':
        return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
      case 'not-available':
        return 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300'
      case 'downloading':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
      case 'downloaded':
        return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
      case 'installing':
        return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
      case 'error':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin" />
      case 'available':
        return <Package className="h-5 w-5" />
      case 'not-available':
        return <CheckCircle2 className="h-5 w-5" />
      case 'downloading':
        return <Download className="h-5 w-5" />
      case 'downloaded':
        return <CheckCircle2 className="h-5 w-5" />
      case 'installing':
        return <Zap className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <RefreshCw className="h-5 w-5" />
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'checking':
        return 'Checking for updates...'
      case 'available':
        return 'Update available!'
      case 'not-available':
        return 'You are up to date'
      case 'downloading':
        return 'Downloading update...'
      case 'downloaded':
        return 'Update ready to install'
      case 'installing':
        return 'Installing update...'
      case 'error':
        return 'Update failed'
      default:
        return 'Ready to check for updates'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Update Simulator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test simulated auto-update functionality with mock download progress and restart
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Status</h2>
          <button
            onClick={reset}
            disabled={state.status === 'checking' || state.status === 'downloading'}
            className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${getStatusColor(state.status)}`}>
            {getStatusIcon(state.status)}
          </div>
          <div>
            <p className="font-semibold text-lg">{getStatusText(state.status)}</p>
            {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
          </div>
        </div>
      </div>

      {/* Update Info Card */}
      {state.updateInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Update Information
          </h2>

          <div className="space-y-4">
            {/* Version & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    New Version
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {state.updateInfo.version}
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                    Release Date
                  </p>
                </div>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                  {formatDate(state.updateInfo.releaseDate)}
                </p>
              </div>
            </div>

            {/* Download Size */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                  Download Size
                </p>
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatBytes(state.updateInfo.downloadSize)}
              </p>
            </div>

            {/* Release Notes */}
            <div className="border dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-lg">Release Notes</h3>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                  {state.updateInfo.releaseNotes}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Card */}
      {state.progress && state.status === 'downloading' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Progress
          </h2>

          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {state.progress.percent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full transition-all duration-300 flex items-center justify-end"
                  style={{ width: `${state.progress.percent}%` }}
                >
                  {state.progress.percent > 10 && (
                    <span className="text-xs font-bold text-white mr-2">
                      {state.progress.percent}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Downloaded</p>
                <p className="text-lg font-bold">{formatBytes(state.progress.transferred)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Size</p>
                <p className="text-lg font-bold">{formatBytes(state.progress.total)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Speed</p>
                <p className="text-lg font-bold">{formatSpeed(state.progress.bytesPerSecond)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Check for Updates */}
          <button
            onClick={checkForUpdates}
            disabled={
              state.status === 'checking' ||
              state.status === 'downloading' ||
              state.status === 'installing'
            }
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.status === 'checking' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            Check for Updates
          </button>

          {/* Download Update */}
          <button
            onClick={downloadUpdate}
            disabled={state.status !== 'available'}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            Download Update
          </button>

          {/* Cancel Download */}
          <button
            onClick={cancelDownload}
            disabled={state.status !== 'downloading'}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
            Cancel Download
          </button>

          {/* Install & Restart */}
          <button
            onClick={installAndRestart}
            disabled={state.status !== 'downloaded'}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="h-5 w-5" />
            Install & Restart
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> This is a simulated auto-update system for demonstration purposes.
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>No real server connection required - all updates are mocked</li>
          <li>Download progress is simulated with realistic speed variations</li>
          <li>70% chance of finding an update when checking</li>
          <li>Random release notes and version numbers are generated</li>
          <li>Install & Restart logs to console (app doesn't actually restart)</li>
        </ul>
      </div>
    </div>
  )
}

export default UpdateSimulatorPage
