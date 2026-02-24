import React, { useEffect, useCallback } from 'react'
import { FolderPlus, FolderOpen, Trash2, RefreshCw, Database, CheckCircle2, XCircle } from 'lucide-react'
import {
  AppButton,
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
  AppSeparator
} from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import {
  loadDirectories,
  addDirectories,
  removeDirectory,
  markDirectoryIndexed,
  setLoading,
  setError,
  handleExternalDirectoriesChange,
  clearDirectories,
  selectDirectories,
  selectDirectoriesLoading,
  selectDirectoriesError,
  selectIndexedCount,
  selectPendingCount
} from '../store/directoriesSlice'

const DirectoriesPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const directories = useAppSelector(selectDirectories)
  const isLoading = useAppSelector(selectDirectoriesLoading)
  const error = useAppSelector(selectDirectoriesError)
  const indexedCount = useAppSelector(selectIndexedCount)
  const pendingCount = useAppSelector(selectPendingCount)

  const [isIndexing, setIsIndexing] = React.useState(false)

  // Load directories from main process on mount
  const fetchDirectories = useCallback(async () => {
    console.log('[DirectoriesPage] Fetching directories from main process...')
    dispatch(setLoading(true))
    // Clear existing directories to prevent showing stale data
    dispatch(clearDirectories())
    try {
      const dirs = await window.directories.list()
      console.log('[DirectoriesPage] Received', dirs.length, 'directories from main process')
      dispatch(loadDirectories(dirs))
    } catch (err) {
      console.error('[DirectoriesPage] Failed to load directories:', err)
      dispatch(setError(err instanceof Error ? err.message : 'Failed to load directories'))
    }
  }, [dispatch])

  useEffect(() => {
    console.log('[DirectoriesPage] Component mounted, fetching directories')
    fetchDirectories()
  }, [fetchDirectories])

  // Listen for external directory changes from main process
  useEffect(() => {
    const unsubscribe = window.directories.onChanged((dirs) => {
      console.log('[DirectoriesPage] Received directories:changed event with', dirs.length, 'directories')
      dispatch(handleExternalDirectoriesChange(dirs))
    })
    return unsubscribe
  }, [dispatch])

  const handleAddDirectories = useCallback(async () => {
    try {
      // Use Electron dialog to select multiple directories
      const result = await window.dialog.openDirectory(true)
      const resultData = result.data as { canceled: boolean; filePaths: string[] }

      if (resultData.canceled || !resultData.filePaths || resultData.filePaths.length === 0) {
        return
      }

      // Send paths to main process for validation and persistence
      const response = await window.directories.addMany(resultData.filePaths)

      if (response.added.length > 0) {
        dispatch(addDirectories(response.added))
      }

      // Report errors for any paths that failed validation
      if (response.errors.length > 0) {
        const errorMessages = response.errors
          .map((e) => `${formatPath(e.path)}: ${e.error}`)
          .join('\n')
        console.warn('[DirectoriesPage] Some directories could not be added:', errorMessages)

        await window.notification.show({
          title: 'Some Directories Skipped',
          body: `${response.errors.length} director${response.errors.length === 1 ? 'y' : 'ies'} could not be added. Check console for details.`,
          urgency: 'normal'
        })
      }
    } catch (err) {
      console.error('[DirectoriesPage] Failed to add directories:', err)
      await window.notification.show({
        title: 'Error',
        body: 'Failed to add directories. Please try again.',
        urgency: 'normal'
      })
    }
  }, [dispatch])

  const handleRemoveDirectory = useCallback(
    async (id: string) => {
      try {
        const removed = await window.directories.remove(id)
        if (removed) {
          dispatch(removeDirectory(id))
        }
      } catch (err) {
        console.error('[DirectoriesPage] Failed to remove directory:', err)
        await window.notification.show({
          title: 'Error',
          body: 'Failed to remove directory. Please try again.',
          urgency: 'normal'
        })
      }
    },
    [dispatch]
  )

  const handleIndexDirectories = useCallback(async () => {
    if (directories.length === 0) {
      await window.notification.show({
        title: 'No Directories',
        body: 'Please add directories to index first.',
        urgency: 'normal'
      })
      return
    }

    setIsIndexing(true)
    try {
      // TODO: Call RAG service to index directories
      // For now, simulate indexing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mark all as indexed via main process
      for (const dir of directories) {
        if (!dir.isIndexed) {
          const success = await window.api.directoriesMarkIndexed(dir.id, true)
          if (success) {
            dispatch(markDirectoryIndexed({
              id: dir.id,
              isIndexed: true,
              lastIndexedAt: Date.now()
            }))
          }
        }
      }

      await window.notification.show({
        title: 'Indexing Complete',
        body: `Successfully indexed ${directories.length} ${directories.length === 1 ? 'directory' : 'directories'}.`,
        urgency: 'normal'
      })
    } catch (err) {
      console.error('[DirectoriesPage] Failed to index directories:', err)
      await window.notification.show({
        title: 'Indexing Failed',
        body: 'Failed to index directories. Please try again.',
        urgency: 'critical'
      })
    } finally {
      setIsIndexing(false)
    }
  }, [directories, dispatch])

  function formatPath(filePath: string): string {
    if (!filePath) return ''
    const parts = filePath.split(/[/\\]/)
    if (parts.length > 3) {
      return `.../${parts.slice(-3).join('/')}`
    }
    return filePath
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Indexed Directories</h1>
              <p className="text-muted-foreground">
                Manage directories for AI-powered document search and retrieval.
              </p>
            </div>
            <div className="flex gap-2">
              <AppButton
                onClick={handleAddDirectories}
                variant="outline"
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                Add Directories
              </AppButton>
              <AppButton
                onClick={handleIndexDirectories}
                disabled={isIndexing || directories.length === 0}
                className="gap-2"
              >
                {isIndexing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Index All
                  </>
                )}
              </AppButton>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <AppCard className="mb-6 border-destructive">
              <AppCardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </AppCardContent>
            </AppCard>
          )}

          {/* Stats Card */}
          <AppCard className="mb-6">
            <AppCardContent className="pt-6">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{directories.length}</p>
                  <p className="text-sm text-muted-foreground">Total Directories</p>
                </div>
                <AppSeparator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{indexedCount}</p>
                  <p className="text-sm text-muted-foreground">Indexed</p>
                </div>
                <AppSeparator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </AppCardContent>
          </AppCard>

          {/* Loading State */}
          {isLoading && (
            <AppCard className="mb-6">
              <AppCardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
                  <p className="text-muted-foreground">Loading directories...</p>
                </div>
              </AppCardContent>
            </AppCard>
          )}

          {/* Directories List */}
          {!isLoading && directories.length === 0 ? (
            <AppCard>
              <AppCardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No directories added yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    Add directories to enable AI-powered document search. The system will index
                    all files in the selected directories for quick retrieval.
                  </p>
                  <AppButton onClick={handleAddDirectories} className="gap-2">
                    <FolderPlus className="h-4 w-4" />
                    Add Your First Directory
                  </AppButton>
                </div>
              </AppCardContent>
            </AppCard>
          ) : (
            <div className="space-y-3">
              {directories.map((dir) => (
                <AppCard key={dir.id}>
                  <AppCardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <AppCardTitle className="text-base truncate">
                            {dir.path?.split(/[/\\]/).pop() ?? ''}
                          </AppCardTitle>
                          {dir.isIndexed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-orange-500 shrink-0" />
                          )}
                        </div>
                        <AppCardDescription className="text-xs" title={dir.path}>
                          {formatPath(dir.path)}
                        </AppCardDescription>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Added: {formatDate(dir.addedAt)}</span>
                          {dir.lastIndexedAt && (
                            <>
                              <span>-</span>
                              <span>Indexed: {formatDate(dir.lastIndexedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <AppButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDirectory(dir.id)}
                        className="shrink-0"
                        title="Remove directory"
                      >
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </div>
                  </AppCardHeader>
                </AppCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DirectoriesPage
