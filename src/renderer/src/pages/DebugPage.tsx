import React, { useEffect, useState, lazy, Suspense } from 'react'
import { Bug, Folder, RefreshCw, AlertCircle, FlaskConical, Download } from 'lucide-react'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

const PipelineTestPage = lazy(() => import('./PipelineTestPage'))
const DownloadsDemoPage = lazy(() =>
  import('./DownloadsDemo').then((m) => ({ default: m.DownloadsDemo }))
)

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type DebugTab = 'debug' | 'pipeline' | 'downloads'

interface TabConfig {
  id: DebugTab
  label: string
  icon: React.ElementType
}

const tabs: TabConfig[] = [
  { id: 'debug', label: 'Debug Tools', icon: Bug },
  { id: 'pipeline', label: 'Pipeline Test', icon: FlaskConical },
  { id: 'downloads', label: 'Downloads Demo', icon: Download },
]

// ---------------------------------------------------------------------------
// DebugToolsPanel — workspace diagnostics
// ---------------------------------------------------------------------------

function DebugToolsPanel(): React.ReactElement {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspace = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const path = await window.workspace.getCurrent()
      setWorkspacePath(path)
    } catch (err) {
      console.error('Failed to load workspace:', err)
      setWorkspacePath(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Error</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Path Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Current Workspace
          </h2>
          <button
            onClick={loadWorkspace}
            disabled={loading}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Workspace Directory Path
            </label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700">
              {workspacePath ? (
                <code className="text-sm font-mono text-green-600 dark:text-green-400">
                  {workspacePath}
                </code>
              ) : (
                <code className="text-sm font-mono text-gray-400 dark:text-gray-600">
                  null (no workspace selected)
                </code>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Debug Mode:</strong> This page is for development and debugging purposes only.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DebugPage
// ---------------------------------------------------------------------------

const DebugPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DebugTab>('debug')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bug className="h-8 w-8" />
          Debug Tools
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Development and debugging information
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'debug' && <DebugToolsPanel />}

      {activeTab === 'pipeline' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <PipelineTestPage />
        </Suspense>
      )}

      {activeTab === 'downloads' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <DownloadsDemoPage />
        </Suspense>
      )}
    </div>
  )
}

export default DebugPage
