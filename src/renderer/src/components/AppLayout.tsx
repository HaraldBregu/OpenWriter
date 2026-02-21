import React, { useState, useCallback }  from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { useAppDispatch, useAppSelector } from '../store'
import { createPost, selectPosts } from '../store/postsSlice'
import { TitleBar } from './TitleBar'
import {
  AppPopover,
  AppPopoverContent,
  AppPopoverTrigger,
  AppSeparator,
  AppSidebar,
  AppSidebarContent,
  AppSidebarGroup,
  AppSidebarGroupContent,
  AppSidebarMenu,
  AppSidebarMenuButton,
  AppSidebarMenuItem,
  AppSidebarMenuSub,
  AppSidebarMenuSubItem,
  AppSidebarMenuSubButton,
  AppSidebarSeparator,
  AppSidebarProvider,
  AppSidebarInset,
  AppSidebarHeader,
  AppSidebarFooter,
  useSidebar
} from './app'
import logoIcon from '@resources/icons/icon.png'
import {
  Newspaper,
  PenLine,
  StickyNote,
  MessageSquare,
  Puzzle,
  FolderOpen,
  HardDrive,
  Cloud,
  FolderKanban,
  Share2,
  Settings,
  User,
  Shield,
  LogOut,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Bell,
  FlaskConical,
} from 'lucide-react'

interface AppLayoutProps {
  readonly children: React.ReactNode
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const quickCreateItems = [
  { title: 'New Post', icon: Newspaper, url: '/new/post', shortcut: '⌘N' },
  { title: 'New Writing', icon: PenLine, url: '/new/writing', shortcut: '⌘W' },
  { title: 'New Note', icon: StickyNote, url: '/new/note', shortcut: '⌘⇧N' },
  { title: 'New Message', icon: MessageSquare, url: '/new/message', shortcut: '⌘M' }
]

const topNavSections = ['Posts', 'Writing', 'Notes', 'Messages']

const documentSubItems = [
  { title: 'Local Documents', icon: HardDrive, url: '/documents/local' },
  { title: 'Remote Documents', icon: Cloud, url: '/documents/remote' },
  { title: 'Project Documents', icon: FolderKanban, url: '/documents/projects' },
  { title: 'Shared with Me', icon: Share2, url: '/documents/shared' }
]

// ---------------------------------------------------------------------------
// Settings popover menu items
// ---------------------------------------------------------------------------

interface SettingsMenuItem {
  title: string
  icon: React.ElementType
  url?: string
  danger?: boolean
  divider?: boolean
}

const settingsMenuItems: SettingsMenuItem[] = [
  { title: 'Account', icon: User },
  { title: 'Settings', icon: Settings, url: '/settings' },
  { title: 'Notifications', icon: Bell },
  { title: 'Privacy', icon: Shield },
  { title: 'Billing', icon: CreditCard },
  { title: 'Help & Support', icon: HelpCircle }
]

// ---------------------------------------------------------------------------
// SettingsPopover
// ---------------------------------------------------------------------------

// Stub — replace with real auth state
const currentUser: { name: string } | null = { name: 'John Doe' }

const SettingsPopover = React.memo(function SettingsPopover() {
  return (
    <AppPopover>
      <AppPopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <span className="flex-1 truncate text-sm text-left">
            {currentUser ? currentUser.name : 'Sign in'}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        </button>
      </AppPopoverTrigger>
      <AppPopoverContent
        side="right"
        align="end"
        className="w-56 p-0"
      >
        <div className="py-1">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon
            const className = "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            return item.url ? (
              <Link
                key={item.title}
                to={item.url}
                className={className}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.title}</span>
              </Link>
            ) : (
              <button
                key={item.title}
                type="button"
                className={className}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.title}</span>
              </button>
            )
          })}

          {currentUser && (
            <>
              <AppSeparator className="my-1" />
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log out</span>
              </button>
            </>
          )}
        </div>
      </AppPopoverContent>
    </AppPopover>
  )
})
SettingsPopover.displayName = 'SettingsPopover'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// AppLayoutInner — rendered inside AppSidebarProvider so it can call useSidebar
// ---------------------------------------------------------------------------

function AppLayoutInner({ children }: AppLayoutProps) {
  const { toggleSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const posts = useAppSelector(selectPosts)

  const [docsOpen, setDocsOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    Posts: false,
    Writing: false,
    Notes: false,
    Messages: false
  })

  const toggleSection = useCallback((title: string) =>
    setSectionsOpen((prev) => ({ ...prev, [title]: !prev[title] })), [])

  const handleNewPost = useCallback(() => {
    const action = createPost()
    dispatch(action)
    navigate(`/new/post/${action.payload.id}`)
  }, [dispatch, navigate])

  // Auto-expand Documents if a sub-route is active
  const isDocsActive = location.pathname.startsWith('/documents')
  const [initialized, setInitialized] = useState(false)
  if (!initialized && isDocsActive) {
    setDocsOpen(true)
    setInitialized(true)
  }

  return (
    <>
      <TitleBar title="Tesseract AI * " onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 min-h-0 w-full">
        <AppSidebar className="border-r top-12 h-[calc(100svh-3rem)]">

          {/* Header */}
          <AppSidebarHeader className="border-b p-4">
            <Link to="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img
                src={logoIcon}
                alt="Tesseract AI"
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="text-md font-normal tracking-tight">Tesseract AI</span>
            </Link>
          </AppSidebarHeader>

          {/* Nav */}
          <AppSidebarContent className="gap-0 py-2">
            <AppSidebarGroup className="py-0">
              <AppSidebarGroupContent>
                <AppSidebarMenu>

                  {/* Quick-create items */}
                  {quickCreateItems.map((item) => {
                    const Icon = item.icon
                    const isNewPost = item.title === 'New Post'
                    return (
                      <AppSidebarMenuItem key={item.title}>
                        <AppSidebarMenuButton
                          asChild={!isNewPost}
                          // isActive={location.pathname === item.url}
                          className="h-9 px-3 group/item"
                          onClick={isNewPost ? handleNewPost : undefined}
                        >
                          {isNewPost ? (
                            <>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">{item.title}</span>
                              <span className="text-xs text-muted-foreground/40 invisible group-hover/item:visible">
                                {item.shortcut}
                              </span>
                            </>
                          ) : (
                            <Link to={item.url}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">{item.title}</span>
                              <span className="text-xs text-muted-foreground/40 invisible group-hover/item:visible">
                                {item.shortcut}
                              </span>
                            </Link>
                          )}
                        </AppSidebarMenuButton>
                      </AppSidebarMenuItem>
                    )
                  })}

                  <AppSidebarSeparator className="my-1" />

                  {/* Posts, Writing, Notes, Messages — collapsible section headers */}
                  {topNavSections.map((section) => {
                    const isOpen = sectionsOpen[section]
                    const isPosts = section === 'Posts'
                    return (
                      <AppSidebarMenuItem key={section}>
                        <button
                          type="button"
                          onClick={() => toggleSection(section)}
                          className="flex w-full items-center gap-1 h-8 px-3 text-xs font-medium text-sidebar-foreground/50 select-none cursor-pointer"
                        >
                          <span className="uppercase tracking-wider">{section}</span>
                          <ChevronRight
                            className={`h-2.5 w-2.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <AppSidebarMenuSub className="border-none">
                            {isPosts && (
                              posts.map((post) => (
                                <AppSidebarMenuSubItem key={post.id}>
                                  <AppSidebarMenuSubButton
                                    asChild
                                    isActive={location.pathname === `/new/post/${post.id}`}
                                  >
                                    <Link to={`/new/post/${post.id}`}>
                                      <span className="flex-1 truncate">{post.title || 'Untitled Post'}</span>
                                      <span className="text-xs text-muted-foreground/40 shrink-0">
                                        {formatRelativeTime(post.updatedAt)}
                                      </span>
                                    </Link>
                                  </AppSidebarMenuSubButton>
                                </AppSidebarMenuSubItem>
                              ))
                            )}
                          </AppSidebarMenuSub>
                        )}
                      </AppSidebarMenuItem>
                    )
                  })}

                  <AppSidebarSeparator className="my-1" />

                  {/* Documents — collapsible */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      isActive={isDocsActive}
                      className="h-9 px-3"
                      onClick={() => setDocsOpen((v) => !v)}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">Documents</span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200 ${docsOpen ? 'rotate-90' : ''}`}
                      />
                    </AppSidebarMenuButton>

                    {docsOpen && (
                      <AppSidebarMenuSub>
                        {documentSubItems.map((sub) => {
                          const Icon = sub.icon
                          return (
                            <AppSidebarMenuSubItem key={sub.title}>
                              <AppSidebarMenuSubButton
                                asChild
                                isActive={location.pathname === sub.url}
                              >
                                <Link to={sub.url}>
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{sub.title}</span>
                                </Link>
                              </AppSidebarMenuSubButton>
                            </AppSidebarMenuSubItem>
                          )
                        })}
                      </AppSidebarMenuSub>
                    )}
                  </AppSidebarMenuItem>

                  {/* Integrations */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === '/integrations'}
                      className="h-9 px-3"
                    >
                      <Link to="/integrations">
                        <Puzzle className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Integrations</span>
                      </Link>
                    </AppSidebarMenuButton>
                  </AppSidebarMenuItem>

                  <AppSidebarSeparator className="my-1" />

                  {/* Pipeline Test (Dev Tool) */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === '/pipeline-test'}
                      className="h-9 px-3"
                    >
                      <Link to="/pipeline-test">
                        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Pipeline Test</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider">
                          Dev
                        </span>
                      </Link>
                    </AppSidebarMenuButton>
                  </AppSidebarMenuItem>

                </AppSidebarMenu>
              </AppSidebarGroupContent>
            </AppSidebarGroup>
          </AppSidebarContent>

          {/* Footer — Settings popover */}
          <AppSidebarFooter className="border-t px-3 py-3">
            <SettingsPopover />
          </AppSidebarFooter>

        </AppSidebar>

        <AppSidebarInset className="flex flex-col flex-1 min-h-0">
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>
        </AppSidebarInset>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// AppLayout
// ---------------------------------------------------------------------------

export function AppLayout({ children }: AppLayoutProps) {
  useTheme()
  useLanguage()

  return (
    <div className="flex flex-col h-screen">
      <AppSidebarProvider className="flex-col flex-1 min-h-0">
        <AppLayoutInner>{children}</AppLayoutInner>
      </AppSidebarProvider>
    </div>
  )
}
