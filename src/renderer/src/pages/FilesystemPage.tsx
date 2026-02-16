import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFilesystem } from '../hooks/useFilesystem'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import {
  FolderOpen,
  Save,
  FileText,
  Eye,
  X,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const FilesystemPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    currentFile,
    watchedDirs,
    watchEvents,
    error,
    loading,
    openFile,
    saveFile,
    clearFile,
    selectAndWatchDir,
    unwatchDir,
    clearEvents
  } = useFilesystem()
  useTheme()
  useLanguage()

  const [newFileName, setNewFileName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')

  const handleSaveNew = async () => {
    if (!newFileName.trim() || !newFileContent.trim()) return
    const success = await saveFile(newFileName, newFileContent)
    if (success) {
      setNewFileName('')
      setNewFileContent('')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('filesystem.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('filesystem.description')}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">{t('filesystem.error')}</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Open File Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t('filesystem.openFile')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={openFile}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              {t('filesystem.browse')}
            </button>
            {currentFile && (
              <button
                onClick={clearFile}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              >
                <X className="h-4 w-4" />
                {t('filesystem.close')}
              </button>
            )}
          </div>
        </div>

        {currentFile ? (
          <div className="space-y-3">
            {/* File Metadata */}
            <div className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{currentFile.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{currentFile.filePath}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>{t('filesystem.size')}: {formatBytes(currentFile.size)}</span>
                <span>{t('filesystem.modified')}: {new Date(currentFile.lastModified).toLocaleString()}</span>
              </div>
            </div>

            {/* File Content */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {t('filesystem.fileContent')}
              </h3>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm font-mono overflow-auto max-h-80 whitespace-pre-wrap break-words">
                {currentFile.content}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('filesystem.noFile')}</p>
            <p className="text-sm mt-2">{t('filesystem.noFileHint')}</p>
          </div>
        )}
      </div>

      {/* Write New File Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Save className="h-5 w-5" />
          {t('filesystem.writeFile')}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('filesystem.fileName')}</label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={t('filesystem.fileNamePlaceholder')}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('filesystem.content')}</label>
            <textarea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              placeholder={t('filesystem.contentPlaceholder')}
              rows={6}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
          <button
            onClick={handleSaveNew}
            disabled={!newFileName.trim() || !newFileContent.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {t('filesystem.saveAs')}
          </button>
        </div>
      </div>

      {/* Directory Watcher Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('filesystem.directoryWatcher')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={selectAndWatchDir}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              {t('filesystem.watchDir')}
            </button>
            {watchEvents.length > 0 && (
              <button
                onClick={clearEvents}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              >
                <Trash2 className="h-4 w-4" />
                {t('filesystem.clearEvents')}
              </button>
            )}
          </div>
        </div>

        {/* Watched Directories */}
        {watchedDirs.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold">{t('filesystem.watchedDirs')}</h3>
            {watchedDirs.map((dir) => (
              <div
                key={dir}
                className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded">
                    <FolderOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="font-mono text-sm">{dir}</span>
                </div>
                <button
                  onClick={() => unwatchDir(dir)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Watch Events Log */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {watchEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('filesystem.noEvents')}</p>
              <p className="text-sm mt-1">{t('filesystem.noEventsHint')}</p>
            </div>
          ) : (
            watchEvents.map((event, idx) => (
              <div
                key={`${event.timestamp}-${idx}`}
                className="flex items-center justify-between p-2.5 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      event.eventType === 'rename'
                        ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {event.eventType}
                  </span>
                  <span className="font-mono">{event.filename || '(unknown)'}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{t('filesystem.note')}</strong> {t('filesystem.fsInfo')}
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>{t('filesystem.feature1')}</li>
          <li>{t('filesystem.feature2')}</li>
          <li>{t('filesystem.feature3')}</li>
          <li>{t('filesystem.feature4')}</li>
          <li>{t('filesystem.feature5')}</li>
        </ul>
      </div>
    </div>
  )
}

export default FilesystemPage
