import { useState, useEffect } from 'react'
import { useTask } from '../hooks/useTask'

interface DownloadState {
  taskId: string
  url: string
  fileName: string
  status: string
  progress: number
  speed?: string
  eta?: string
  downloaded?: number
  total?: number
  error?: string
  result?: {
    filePath: string
    size: number
    mimeType: string
    diagnostics: {
      totalDurationMs: number
      averageSpeedBytesPerSec: number
      conflictResolved: boolean
      resolvedFileName: string
    }
  }
}

/**
 * Demo page for testing parallel file downloads with debug instrumentation.
 *
 * Features:
 * - Download 2 files simultaneously
 * - Real-time progress tracking with speed/ETA
 * - Individual cancellation
 * - Debug console showing all events
 * - Automatic save to system downloads folder
 */
export function DownloadsDemo() {
  const { submitTask, cancelTask, tasks } = useTask()
  const [downloads, setDownloads] = useState<Map<string, DownloadState>>(new Map())
  const [debugLog, setDebugLog] = useState<Array<{ time: string; message: string }>>([])

  // Test file URLs (public domain files for testing)
  const testFiles = [
    {
      name: 'Sample PDF',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'sample-test.pdf'
    },
    {
      name: 'JSON Sample',
      url: 'https://jsonplaceholder.typicode.com/posts',
      fileName: 'sample-data.json'
    }
  ]

  // Add debug log entry
  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString()
    setDebugLog(prev => [{ time, message }, ...prev].slice(0, 50)) // Keep last 50 entries
    console.log(`[DownloadsDemo] ${message}`)
  }

  // Download a file
  const handleDownload = async (url: string, fileName: string) => {
    addLog(`Starting download: ${fileName}`)

    const taskId = await submitTask('file-download', {
      url,
      fileName
      // destDir is optional - will default to system downloads folder
    }, {
      priority: 'high'
    })

    if (taskId) {
      setDownloads(prev => new Map(prev).set(taskId, {
        taskId,
        url,
        fileName,
        status: 'queued',
        progress: 0
      }))
      addLog(`Task created: ${taskId}`)
    } else {
      addLog(`Failed to create download task for ${fileName}`)
    }
  }

  // Cancel a download
  const handleCancel = async (taskId: string) => {
    addLog(`Cancelling download: ${taskId}`)
    const cancelled = await cancelTask(taskId)
    if (cancelled) {
      addLog(`Successfully cancelled: ${taskId}`)
    }
  }

  // Download all test files
  const handleDownloadAll = async () => {
    addLog('=== Starting parallel downloads ===')
    for (const file of testFiles) {
      await handleDownload(file.url, file.fileName)
      // Small delay to see them queue up
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Sync task states to download states
  useEffect(() => {
    const updated = new Map(downloads)

    for (const [taskId, task] of tasks) {
      const existing = updated.get(taskId)
      if (!existing) continue // Only update downloads we initiated

      const detail = task.message ? (typeof task.message === 'object' ? task.message : {}) : {}
      const progressDetail = typeof detail === 'object' && detail !== null ? detail as Record<string, unknown> : {}

      updated.set(taskId, {
        ...existing,
        status: task.status,
        progress: task.progress ?? 0,
        speed: progressDetail.speed as string | undefined,
        eta: progressDetail.eta as string | undefined,
        downloaded: progressDetail.downloaded as number | undefined,
        total: progressDetail.total as number | undefined,
        error: task.error,
        result: task.result as DownloadState['result']
      })

      // Log state changes
      if (existing.status !== task.status) {
        addLog(`${taskId.slice(0, 8)}: ${existing.status} → ${task.status}`)
      }
    }

    setDownloads(updated)
  }, [tasks])

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Parallel Downloads Demo</h1>
      <p className="text-gray-600 mb-6">
        Test the task execution system by downloading multiple files simultaneously.
        Files are saved to your system Downloads folder.
      </p>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={handleDownloadAll}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          Download All ({testFiles.length} files)
        </button>
        {testFiles.map((file, index) => (
          <button
            key={index}
            onClick={() => handleDownload(file.url, file.fileName)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Download {file.name}
          </button>
        ))}
      </div>

      {/* Active Downloads */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Downloads</h2>
        {downloads.size === 0 ? (
          <p className="text-gray-500 italic">No downloads yet. Click a button above to start.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(downloads.values()).map((download) => (
              <div
                key={download.taskId}
                className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{download.fileName}</div>
                    <div className="text-sm text-gray-600 font-mono">
                      {download.taskId.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        download.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : download.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : download.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-800'
                              : download.status === 'running'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {download.status}
                    </span>
                    {(download.status === 'running' || download.status === 'queued') && (
                      <button
                        onClick={() => handleCancel(download.taskId)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {download.progress > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{download.progress}%</span>
                      <span className="text-gray-600">
                        {download.downloaded ? formatBytes(download.downloaded) : '0 B'} /{' '}
                        {download.total ? formatBytes(download.total) : 'Unknown'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${download.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Speed & ETA */}
                {(download.speed || download.eta) && download.status === 'running' && (
                  <div className="flex gap-6 text-sm text-gray-700 mb-2">
                    {download.speed && (
                      <div>
                        <span className="font-medium">Speed:</span> {download.speed}
                      </div>
                    )}
                    {download.eta && (
                      <div>
                        <span className="font-medium">ETA:</span> {download.eta}
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {download.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                    <span className="font-medium">Error:</span> {download.error}
                  </div>
                )}

                {/* Completed Info */}
                {download.status === 'completed' && download.result && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm space-y-1">
                    <div>
                      <span className="font-medium">File Path:</span>{' '}
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                        {download.result.filePath}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {formatBytes(download.result.size)}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {download.result.mimeType}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>{' '}
                      {(download.result.diagnostics.totalDurationMs / 1000).toFixed(2)}s
                    </div>
                    <div>
                      <span className="font-medium">Avg Speed:</span>{' '}
                      {(download.result.diagnostics.averageSpeedBytesPerSec / (1024 * 1024)).toFixed(2)} MB/s
                    </div>
                    {download.result.diagnostics.conflictResolved && (
                      <div className="text-yellow-700">
                        <span className="font-medium">⚠️ Renamed:</span>{' '}
                        {download.result.diagnostics.resolvedFileName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Console */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Debug Console</h2>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
          {debugLog.length === 0 ? (
            <div className="text-gray-500">No events yet...</div>
          ) : (
            <div className="space-y-1">
              {debugLog.map((log, index) => (
                <div key={index}>
                  <span className="text-gray-500">[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
