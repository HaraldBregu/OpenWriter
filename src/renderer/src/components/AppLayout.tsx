import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { useAppDispatch, useAppSelector } from '../store'
import {
  createThread,
  deleteThread,
  setActiveThread,
  selectThreads,
  selectActiveThreadId
} from '../store/chatSlice'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  PenLine,
  BookMarked,
  Send,
  Image,
  Film,
  File,
  BookOpen,
  ChevronRight,
  LogOut,
  Star,
  UserCog,
  CreditCard,
  Bell as BellIcon,
  ChevronUp,
  Brain,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react'

interface AppLayoutProps {
  readonly children: React.ReactNode
}

interface NavItem {
  title: string
  icon?: React.ElementType
  url: string
  disabled?: boolean
  description?: string
  count?: number
}

interface NavGroup {
  label: string
  icon?: React.ElementType
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'POSTS',
    items: [
      { title: 'All Posts', icon: BookMarked, url: '/posts', count: 12 },
      { title: 'Drafts', icon: PenLine, url: '/posts/drafts', count: 4 },
      { title: 'Published', icon: Send, url: '/posts/published', count: 8 },
    ]
  },
  {
    label: 'RESOURCES',
    items: [
      { title: 'Images', icon: Image, url: '/resources/images' },
      { title: 'Media', icon: Film, url: '/resources/media' },
      { title: 'Files', icon: File, url: '/resources/files' },
      { title: 'Documents', icon: BookOpen, url: '/resources/documents' }
    ]
  },
  {
    label: 'BRAIN',
    icon: Brain,
    items: [
      { title: 'Decider', url: '/brain/decider' },
      { title: 'Memory', url: '/brain/memory' },
      { title: 'Perception', url: '/brain/perception' },
      { title: 'Reasoning', url: '/brain/reasoning' },
      { title: 'Intuition', url: '/brain/intuition' },
      { title: 'Attention', url: '/brain/attention' },
      { title: 'Emotions', url: '/brain/emotions' }
    ]
  }
]

function NavGroupSection({
  group,
  currentPath
}: {
  group: NavGroup
  currentPath: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarGroup className="mb-4 py-0">
      {/* Section label — clickable to collapse */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center px-3 py-2 text-xs font-normal tracking-widest text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors"
      >
        {group.icon && <group.icon className="h-3 w-3 mr-1.5 shrink-0" />}
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => {
              const isActive = currentPath === item.url
              const ItemIcon = item.icon
              const inner = (
                <>
                  {ItemIcon && <ItemIcon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="flex-1 truncate text-md">{item.title}</span>
                  {item.count !== undefined && (
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground/40">
                      {item.count}
                    </span>
                  )}
                </>
              )

              return (
                <SidebarMenuItem key={item.title}>
                  {item.disabled ? (
                    <SidebarMenuButton disabled className="h-9 px-3 opacity-40">
                      {inner}
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-9 px-3"
                      tooltip={item.description}
                    >
                      <Link to={item.url}>{inner}</Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

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

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [footerOpen, setFooterOpen] = useState(false)
  useTheme()
  useLanguage()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
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
                      className="h-9 px-3">
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

            {/* Dynamic nav groups */}
            {navGroups.map((group) => (
              <NavGroupSection key={group.label} group={group} currentPath={location.pathname} />
            ))}
          </SidebarContent>

          {/* Footer — Account */}
          <SidebarFooter className="border-t px-3 py-2 gap-1">

            <button
              onClick={() => setFooterOpen((v) => !v)}
              className="flex w-full items-center px-2 py-2 text-xs font-normal tracking-widest text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors"
            >
              <span className="flex-1 text-left">ACCOUNT</span>
              <ChevronUp
                className={`h-3 w-3 shrink-0 transition-transform ${footerOpen ? '' : 'rotate-180'}`}
              />
            </button>

            {/* Dropdown Menu */}
            {footerOpen && (
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-9 px-3">
                    <Star className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Upgrade to Pro</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/settings'}
                    className="h-9 px-3"
                  >
                    <Link to="/settings">
                      <UserCog className="h-4 w-4 shrink-0" />
                      <span className="text-sm">Account</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-9 px-3">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Billing</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-9 px-3">
                    <BellIcon className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Notifications</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <div className="my-1 mx-2 border-t border-border/50" />
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Log out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}

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
