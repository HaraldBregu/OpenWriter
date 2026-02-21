import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, GitBranch, Terminal, CloudDownload, Clock } from 'lucide-react'
import { AppButton } from '@/components/app'
import { TitleBar } from '@/components/TitleBar'
import { reloadPostsFromWorkspace } from '../hooks/usePostsLoader'
import { useAppDispatch } from '../store'
import logoIcon from '@resources/icons/icon.png'

interface RecentProject {
  path: string
  lastOpened: number
}

// Dummy projects shown when the API returns an empty list.
// Using realistic-looking paths that work across platforms.
const DUMMY_RECENT_PROJECTS: RecentProject[] = [
  { path: 'C:\\Users\\Alex\\Documents\\Projects\\ecommerce-platform', lastOpened: Date.now() - 1000 * 60 * 30 },
  { path: 'C:\\Users\\Alex\\Documents\\Projects\\design-system-v2', lastOpened: Date.now() - 1000 * 60 * 60 * 3 },
  { path: 'C:\\Users\\Alex\\Documents\\Projects\\mobile-app-backend', lastOpened: Date.now() - 1000 * 60 * 60 * 24 },
  { path: 'C:\\Users\\Alex\\Documents\\Projects\\analytics-dashboard', lastOpened: Date.now() - 1000 * 60 * 60 * 24 * 3 },
  { path: 'C:\\Users\\Alex\\Documents\\Projects\\internal-docs', lastOpened: Date.now() - 1000 * 60 * 60 * 24 * 7 },
]

const WelcomePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  useEffect(() => {
    loadRecentProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRecentProjects = async () => {
    try {
      const projects = await window.api.workspaceGetRecent()
      // Fall back to dummy data so the section is never empty on first launch.
      setRecentProjects(projects.length > 0 ? projects : DUMMY_RECENT_PROJECTS)
    } catch (error) {
      console.error('Failed to load recent projects:', error)
      setRecentProjects(DUMMY_RECENT_PROJECTS)
    }
  }

  const handleOpenProject = useCallback(async () => {
    try {
      const folderPath = await window.api.workspaceSelectFolder()
      if (folderPath) {
        // Set the workspace
        await window.api.workspaceSetCurrent(folderPath)

        // Load posts from the newly selected workspace
        try {
          await reloadPostsFromWorkspace(dispatch)
        } catch (error) {
          console.error('[WelcomePage] Failed to load posts after workspace selection:', error)
          // Don't block navigation if posts fail to load
        }

        // Navigate to home
        navigate('/home')
      }
    } catch (error) {
      console.error('Failed to open project:', error)
    }
  }, [navigate, dispatch])

  const handleOpenRecentProject = useCallback(async (path: string) => {
    try {
      // Set the workspace
      await window.api.workspaceSetCurrent(path)

      // Load posts from the selected workspace
      try {
        await reloadPostsFromWorkspace(dispatch)
      } catch (error) {
        console.error('[WelcomePage] Failed to load posts after selecting recent project:', error)
        // Don't block navigation if posts fail to load
      }

      // Navigate to home
      navigate('/home')
    } catch (error) {
      console.error('Failed to open recent project:', error)
    }
  }, [navigate, dispatch])

  const formatPath = (path: string) => {
    if (path.includes('/Users/')) {
      const parts = path.split('/Users/')
      if (parts[1]) return '~/' + parts[1].split('/').slice(1).join('/')
    }
    if (path.includes('/home/')) {
      const parts = path.split('/home/')
      if (parts[1]) return '~/' + parts[1].split('/').slice(1).join('/')
    }
    if (path.includes('\\Users\\')) {
      const parts = path.split('\\Users\\')
      if (parts[1]) return '~\\' + parts[1].split('\\').slice(1).join('\\')
    }
    return path
  }

  const getProjectName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar title="Tesseract AI" />

      {/* Main content — vertically centered, scrollable if viewport is very small */}
      <div className="flex flex-col items-center flex-1 overflow-y-auto px-8 py-12">

        {/* ── Hero ── */}
        <div className="flex flex-col items-center mb-10">
          <img
            src={logoIcon}
            alt="Tesseract AI"
            className="h-16 w-16 mb-5 drop-shadow-sm"
          />
          <h1 className="text-3xl font-semibold text-foreground mb-2 tracking-tight">
            Tesseract AI
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
            An intelligent text editor for developers and writers.
            Open a project to get started.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Free Plan
            {' '}
            &bull;
            {' '}
            <span className="text-primary cursor-pointer hover:underline">
              Upgrade to Pro
            </span>
          </p>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <AppButton
            variant="outline"
            className="h-24 w-44 flex flex-col items-center justify-center gap-3 rounded-xl border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors"
            onClick={handleOpenProject}
          >
            <FolderOpen className="h-5 w-5 text-foreground/70" />
            <span className="text-sm font-medium">Open Folder</span>
          </AppButton>

          <AppButton
            variant="outline"
            className="h-24 w-44 flex flex-col items-center justify-center gap-3 rounded-xl border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors opacity-60 cursor-not-allowed"
            disabled
          >
            <CloudDownload className="h-5 w-5 text-foreground/70" />
            <span className="text-sm font-medium">Load from Remote</span>
          </AppButton>

          <AppButton
            variant="outline"
            className="h-24 w-44 flex flex-col items-center justify-center gap-3 rounded-xl border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors opacity-60 cursor-not-allowed"
            disabled
          >
            <GitBranch className="h-5 w-5 text-foreground/70" />
            <span className="text-sm font-medium">Clone Repo</span>
          </AppButton>

          <AppButton
            variant="outline"
            className="h-24 w-44 flex flex-col items-center justify-center gap-3 rounded-xl border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors opacity-60 cursor-not-allowed"
            disabled
          >
            <Terminal className="h-5 w-5 text-foreground/70" />
            <span className="text-sm font-medium">Connect via SSH</span>
          </AppButton>
        </div>

        {/* ── Recent projects ── */}
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Projects
            </h2>
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              View all
            </span>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {recentProjects.slice(0, 5).map((project, index) => (
              <button
                key={index}
                onClick={() => handleOpenRecentProject(project.path)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3
                  hover:bg-accent transition-colors text-left
                  ${index !== 0 ? 'border-t border-border' : ''}
                `}
              >
                {/* Folder color indicator */}
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </div>

                {/* Name + path */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {getProjectName(project.path)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate mt-0.5">
                    {formatPath(project.path)}
                  </span>
                </div>

                {/* Relative time */}
                <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(project.lastOpened)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default WelcomePage
