import React, { useEffect, useState } from 'react'
import { Bug, Folder, RefreshCw, FileJson, AlertCircle } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../store'
import { selectPosts } from '../store/postsSlice'
import { reloadPostsFromWorkspace } from '../hooks/usePostsLoader'

const DebugPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const posts = useAppSelector(selectPosts)
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspace = async () => {
    setLoading(true)
    setError(null)
    try {
      const path = await window.api.workspaceGetCurrent()
      setWorkspacePath(path)
    } catch (error) {
      console.error('Failed to load workspace:', error)
      setWorkspacePath(null)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadPosts = async () => {
    setLoadingPosts(true)
    setError(null)
    try {
      console.log('[DebugPage] Manually triggering post load...')
      await reloadPostsFromWorkspace(dispatch)
      console.log('[DebugPage] Posts loaded successfully')
    } catch (error) {
      console.error('[DebugPage] Failed to load posts:', error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

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

      {/* Posts Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Posts in Redux Store
          </h2>
          <button
            onClick={handleLoadPosts}
            disabled={loadingPosts || !workspacePath}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingPosts ? 'animate-spin' : ''}`} />
            Load Posts
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Posts Count
            </label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700">
              <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                {posts.length} post{posts.length !== 1 ? 's' : ''}
              </code>
            </div>
          </div>

          {posts.length > 0 && (
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Post IDs
              </label>
              <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 max-h-40 overflow-y-auto">
                <ul className="text-sm font-mono space-y-1">
                  {posts.map((post) => (
                    <li key={post.id} className="text-gray-700 dark:text-gray-300">
                      • {post.id} - {post.title || '(untitled)'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
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

export default DebugPage
