import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, GitBranch, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TitleBar } from '@/components/TitleBar'
import logoIcon from '@resources/icons/icon.png'

interface RecentProject {
  path: string
  lastOpened: number
}

const WelcomePage: React.FC = () => {
  const navigate = useNavigate()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  useEffect(() => {
    checkAndLoadWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAndLoadWorkspace = async () => {
    try {
      // Check if workspace is already set
      const currentWorkspace = await window.api.workspaceGetCurrent()
      if (currentWorkspace) {
        console.log('[WelcomePage] Workspace already set, redirecting to home')
        navigate('/home')
        return
      }

      // Load recent projects
      loadRecentProjects()
    } catch (error) {
      console.error('Failed to check workspace:', error)
      loadRecentProjects()
    }
  }

  const loadRecentProjects = async () => {
    try {
      const projects = await window.api.workspaceGetRecent()
      setRecentProjects(projects)
    } catch (error) {
      console.error('Failed to load recent projects:', error)
    }
  }

  const handleOpenProject = async () => {
    try {
      const folderPath = await window.api.workspaceSelectFolder()
      if (folderPath) {
        await window.api.workspaceSetCurrent(folderPath)
        navigate('/home')
      }
    } catch (error) {
      console.error('Failed to open project:', error)
    }
  }

  const handleOpenRecentProject = async (path: string) => {
    try {
      await window.api.workspaceSetCurrent(path)
      navigate('/home')
    } catch (error) {
      console.error('Failed to open recent project:', error)
    }
  }

  const formatPath = (path: string) => {
    // Simple path formatting - show relative to common base paths
    if (path.includes('/Users/')) {
      const parts = path.split('/Users/')
      if (parts[1]) {
        return '~/' + parts[1].split('/').slice(1).join('/')
      }
    }
    if (path.includes('/home/')) {
      const parts = path.split('/home/')
      if (parts[1]) {
        return '~/' + parts[1].split('/').slice(1).join('/')
      }
    }
    if (path.includes('\\Users\\')) {
      const parts = path.split('\\Users\\')
      if (parts[1]) {
        return '~\\' + parts[1].split('\\').slice(1).join('\\')
      }
    }
    return path
  }

  const getProjectName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  return (
    <div className="flex flex-col h-screen">
      <TitleBar title="Tesseract AI" />
      <div className="flex flex-col items-center justify-center flex-1 bg-background px-8">
      {/* Logo and Title */}
      <div className="flex flex-col items-center mb-12">
        <img
          src={logoIcon}
          alt="Tesseract AI"
          className="h-16 w-16 mb-4"
        />
        <h1 className="text-3xl font-semibold text-foreground mb-2">Tesseract AI</h1>
        <p className="text-muted-foreground">Free Plan • <span className="text-primary cursor-pointer hover:underline">Upgrade</span></p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-16">
        <Button
          variant="outline"
          className="h-24 w-44 flex flex-col items-center justify-center gap-3 hover:bg-accent"
          onClick={handleOpenProject}
        >
          <FolderOpen className="h-6 w-6" />
          <span className="text-sm font-medium">Open project</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 w-44 flex flex-col items-center justify-center gap-3 hover:bg-accent"
          disabled
        >
          <GitBranch className="h-6 w-6" />
          <span className="text-sm font-medium">Clone repo</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 w-44 flex flex-col items-center justify-center gap-3 hover:bg-accent"
          disabled
        >
          <Terminal className="h-6 w-6" />
          <span className="text-sm font-medium">Connect via SSH</span>
        </Button>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">Recent projects</h2>
            <span className="text-sm text-muted-foreground">View all ({recentProjects.length})</span>
          </div>

          <div className="space-y-2">
            {recentProjects.slice(0, 5).map((project, index) => (
              <button
                key={index}
                onClick={() => handleOpenRecentProject(project.path)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-accent transition-colors text-left"
              >
                <span className="text-sm text-foreground">{getProjectName(project.path)}</span>
                <span className="text-sm text-muted-foreground">{formatPath(project.path)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default WelcomePage
