import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { useAppDispatch, useAppSelector } from '../store'
import {
  createThread,
  deleteThread,
  setActiveThread,
  selectThreads,
  selectActiveThreadId,
  selectRunningThreadId
} from '../store/chatSlice'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter
} from './ui/sidebar'
import {
  Home,
  FileText,
  Cloud,
  HardDrive,
  Settings as SettingsIcon,
  Bell as BellIcon,
  Shield,
  LogOut,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react'

interface AppLayoutProps {
  readonly children: React.ReactNode
}

// ---------------------------------------------------------------------------
// Documents nav items
// ---------------------------------------------------------------------------

const documentItems = [
  { title: 'Recent Documents', icon: FileText, url: '#' },
  { title: 'Remote Documents', icon: Cloud, url: '#' },
  { title: 'Local Storage', icon: HardDrive, url: '#' },
  { title: 'Document RAG', icon: FileText, url: '/rag' }
]

// ---------------------------------------------------------------------------
// Settings nav items
// ---------------------------------------------------------------------------

const settingsItems = [
  { title: 'General', icon: SettingsIcon, url: '/settings', disabled: false },
  { title: 'Notifications', icon: BellIcon, url: '/notifications', disabled: false },
  { title: 'Privacy', icon: Shield, url: '#', disabled: true }
]

// ---------------------------------------------------------------------------
// Thread list
// ---------------------------------------------------------------------------

function ThreadList({
  currentPath,
  onNavigate
}: {
  currentPath: string
  onNavigate: () => void
}) {
  const dispatch = useAppDispatch()
  const threads = useAppSelector(selectThreads)
  const activeThreadId = useAppSelector(selectActiveThreadId)
  const runningThreadId = useAppSelector(selectRunningThreadId)

  const handleNew = () => {
    dispatch(createThread('openai'))
    onNavigate()
  }

  const handleSelect = (id: string) => {
    dispatch(setActiveThread(id))
    onNavigate()
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    dispatch(deleteThread(id))
  }

  return (
    <SidebarGroup className="mb-4 py-0">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-normal tracking-widest text-muted-foreground/30">
          THREADS
        </span>
        <button
          type="button"
          onClick={handleNew}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted transition-colors"
          title="New thread"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {threads.length === 0 ? (
        <p className="px-3 py-1 text-xs text-muted-foreground/30 italic">No threads yet</p>
      ) : (
        <SidebarGroupContent>
          <SidebarMenu>
            {threads.map((thread) => {
              const isActive = currentPath === '/' && thread.id === activeThreadId
              return (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    isActive={isActive}
                    className="h-9 px-3 group/thread"
                    onClick={() => handleSelect(thread.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{thread.title}</span>
                    {thread.id === runningThreadId && (
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, thread.id)}
                      className="opacity-0 group-hover/thread:opacity-100 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive transition-all"
                      title="Delete thread"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

// ---------------------------------------------------------------------------
// AppLayout
// ---------------------------------------------------------------------------

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  useTheme()
  useLanguage()

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <Sidebar className="border-r">

          {/* Header */}
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <span className="text-md font-normal tracking-tight">Tesseract AI</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">

            {/* Dashboard — top-level, no group label */}
            <SidebarGroup className="mb-3 py-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/'}
                      className="h-9 px-3"
                    >
                      <Link to="/">
                        <Home className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 text-md font-normal">Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Thread list */}
            <ThreadList
              currentPath={location.pathname}
              onNavigate={() => navigate('/')}
            />

            {/* Documents */}
            <SidebarGroup className="mb-4 py-0">
              <SidebarGroupLabel className="text-xs font-normal tracking-widest text-muted-foreground/30 px-3 h-8">
                Documents
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {documentItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.url && item.url !== '#'}
                          className="h-9 px-3"
                        >
                          <Link to={item.url}>
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate text-md">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Settings */}
            <SidebarGroup className="mb-4 py-0">
              <SidebarGroupLabel className="text-xs font-normal tracking-widest text-muted-foreground/30 px-3 h-8">
                Settings
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                          <SidebarMenuButton disabled className="h-9 px-3 opacity-40">
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate text-md">{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={location.pathname === item.url}
                            className="h-9 px-3"
                          >
                            <Link to={item.url}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate text-md">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

          </SidebarContent>

          {/* Footer — Account */}
          <SidebarFooter className="border-t px-3 py-3">
            <div className="flex items-center gap-3 px-2">
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 select-none">
                JD
              </div>
              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">John Doe</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
              {/* Log out */}
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </SidebarFooter>

        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex items-center gap-2">
              <h1 className="text-md font-semibold tracking-tight">Tesseract AI</h1>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
