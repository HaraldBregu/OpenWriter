import React, { useState, useEffect, useCallback } from 'react'
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

interface IndexedDirectory {
  id: string
  path: string
  addedAt: number
  isIndexed: boolean
  lastIndexedAt?: number
}

const DirectoriesPage: React.FC = () => {
  const [directories, setDirectories] = useState<IndexedDirectory[]>([])
  const [isIndexing, setIsIndexing] = useState(false)

  const loadDirectories = useCallback(async () => {
    try {
      // TODO: Load from store/service
      // For now, use localStorage as placeholder
      const saved = localStorage.getItem('indexed_directories')
      console.log('[DirectoriesPage] Loading directories from localStorage:', saved)
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('[DirectoriesPage] Parsed directories:', parsed)
        setDirectories(parsed)
      }
    } catch (error) {
      console.error('[DirectoriesPage] Failed to load directories:', error)
    }
  }, [])

  // Load saved directories from store on mount
  useEffect(() => {
    loadDirectories()
  }, [loadDirectories])

  const saveDirectories = useCallback(async (dirs: IndexedDirectory[]) => {
    try {
      console.log('[DirectoriesPage] Saving directories:', dirs)
      // TODO: Save to store/service
      localStorage.setItem('indexed_directories', JSON.stringify(dirs))
      setDirectories(dirs)
    } catch (error) {
      console.error('[DirectoriesPage] Failed to save directories:', error)
    }
  }, [])

  const handleAddDirectories = useCallback(async () => {
    try {
      console.log('[DirectoriesPage] Opening directory dialog...')
      // Use Electron dialog to select multiple directories
      const result = await window.api.dialogOpenDirectory(true)

      console.log('[DirectoriesPage] Dialog result (raw):', result)

      // The result is wrapped in IpcResult format: { success: true, data: DialogResult }
      const resultData = result.data as { canceled: boolean; filePaths: string[] }

      console.log('[DirectoriesPage] Dialog result data:', resultData)

      if (resultData.canceled || !resultData.filePaths || resultData.filePaths.length === 0) {
        console.log('[DirectoriesPage] Dialog canceled or no paths selected')
        return
      }

      console.log('[DirectoriesPage] Selected paths:', resultData.filePaths)

      // Add new directories (avoid duplicates)
      const newDirs: IndexedDirectory[] = resultData.filePaths
        .filter((path) => !directories.some((dir) => dir.path === path))
        .map((path) => ({
          id: `dir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          path,
          addedAt: Date.now(),
          isIndexed: false
        }))

      console.log('[DirectoriesPage] New directories to add:', newDirs)
      console.log('[DirectoriesPage] Current directories:', directories)

      if (newDirs.length > 0) {
        const updated = [...directories, ...newDirs]
        console.log('[DirectoriesPage] Updated directories list:', updated)
        await saveDirectories(updated)
      } else {
        console.log('[DirectoriesPage] No new directories to add (all selected already exist)')
      }
    } catch (error) {
      console.error('[DirectoriesPage] Failed to add directories:', error)
      await window.api.notificationShow({
        title: 'Error',
        body: 'Failed to add directories. Please try again.',
        urgency: 'normal'
      })
    }
  }, [directories, saveDirectories])

  const handleRemoveDirectory = useCallback(async (id: string) => {
    const updated = directories.filter((dir) => dir.id !== id)
    await saveDirectories(updated)
  }, [directories, saveDirectories])

  const handleIndexDirectories = useCallback(async () => {
    if (directories.length === 0) {
      await window.api.notificationShow({
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

      // Mark all as indexed
      const updated = directories.map((dir) => ({
        ...dir,
        isIndexed: true,
        lastIndexedAt: Date.now()
      }))

      await saveDirectories(updated)

      await window.api.notificationShow({
        title: 'Indexing Complete',
        body: `Successfully indexed ${directories.length} ${directories.length === 1 ? 'directory' : 'directories'}.`,
        urgency: 'normal'
      })
    } catch (error) {
      console.error('[DirectoriesPage] Failed to index directories:', error)
      await window.api.notificationShow({
        title: 'Indexing Failed',
        body: 'Failed to index directories. Please try again.',
        urgency: 'critical'
      })
    } finally {
      setIsIndexing(false)
    }
  }, [directories, saveDirectories])

  function formatPath(path: string): string {
    // Show only the last 2-3 parts of the path for readability
    const parts = path.split(/[/\\]/)
    if (parts.length > 3) {
      return `.../${parts.slice(-3).join('/')}`
    }
    return path
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
                  <p className="text-3xl font-bold text-foreground">
                    {directories.filter((d) => d.isIndexed).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Indexed</p>
                </div>
                <AppSeparator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {directories.filter((d) => !d.isIndexed).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </AppCardContent>
          </AppCard>

          {/* Directories List */}
          {directories.length === 0 ? (
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
                            {dir.path.split(/[/\\]/).pop()}
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
                              <span>•</span>
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
