import React, { useState, useEffect } from 'react'
import { FolderOpen, Clock, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

interface WorkspaceInfo {
  path: string
  lastOpened: number
}

const WorkspaceSelectorPage: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [recentWorkspaces, setRecentWorkspaces] = useState<WorkspaceInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadRecentWorkspaces()
  }, [])

  const loadRecentWorkspaces = async (): Promise<void> => {
    try {
      const recents = await window.api.workspaceGetRecent()
      setRecentWorkspaces(recents)
    } catch (error) {
      console.error('Failed to load recent workspaces:', error)
    }
  }

  const handleBrowseFolder = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const folderPath = await window.api.workspaceSelectFolder()
      if (folderPath) {
        setSelectedPath(folderPath)
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenWorkspace = async (): Promise<void> => {
    if (!selectedPath) return

    setIsLoading(true)
    try {
      await window.api.workspaceConfirm(selectedPath)
    } catch (error) {
      console.error('Failed to confirm workspace:', error)
      setIsLoading(false)
    }
  }

  const handleSelectRecent = (workspace: WorkspaceInfo): void => {
    setSelectedPath(workspace.path)
  }

  const handleCancel = async (): Promise<void> => {
    await window.api.workspaceCancel()
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getDirectoryName = (path: string): string => {
    const parts = path.split(/[/\\]/)
    return parts[parts.length - 1] || path
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold text-center">
            Select Workspace
          </CardTitle>
          <CardDescription className="text-center text-base">
            Choose a folder where your Tesseract AI projects will be stored
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Browse for folder section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBrowseFolder}
                disabled={isLoading}
                className="flex-shrink-0"
                size="lg"
              >
                <FolderOpen className="mr-2 h-5 w-5" />
                Browse Folder
              </Button>
              {selectedPath && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Selected folder:
                  </p>
                  <p className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded border truncate">
                    {selectedPath}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent workspaces section */}
          {recentWorkspaces.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Recent Workspaces</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentWorkspaces.map((workspace, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectRecent(workspace)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      selectedPath === workspace.path
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {getDirectoryName(workspace.path)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {workspace.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(workspace.lastOpened)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleOpenWorkspace}
              disabled={!selectedPath || isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? 'Opening...' : 'Open Workspace'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkspaceSelectorPage
