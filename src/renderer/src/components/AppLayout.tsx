import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { TitleBar } from './TitleBar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Separator } from './ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarFooter,
  useSidebar
} from './ui/sidebar'
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
  Home
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
  danger?: boolean
  divider?: boolean
}

const settingsMenuItems: SettingsMenuItem[] = [
  { title: 'Account', icon: User },
  { title: 'Settings', icon: Settings },
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

function SettingsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <span className="flex-1 truncate text-sm text-left">
            {currentUser ? currentUser.name : 'Sign in'}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        className="w-56 p-0"
      >
        <div className="py-1">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.title}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.title}</span>
              </button>
            )
          })}

          {currentUser && (
            <>
              <Separator className="my-1" />
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
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// AppLayoutInner — rendered inside SidebarProvider so it can call useSidebar
// ---------------------------------------------------------------------------

function AppLayoutInner({ children }: AppLayoutProps) {
  const { toggleSidebar } = useSidebar()
  const location = useLocation()
  const [docsOpen, setDocsOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    Posts: false,
    Writing: false,
    Notes: false,
    Messages: false
  })

  const toggleSection = (title: string) =>
    setSectionsOpen((prev) => ({ ...prev, [title]: !prev[title] }))

  // Auto-expand Documents if a sub-route is active
  const isDocsActive = location.pathname.startsWith('/documents')
  const [initialized, setInitialized] = useState(false)
  if (!initialized && isDocsActive) {
    setDocsOpen(true)
    setInitialized(true)
  }

  return (
    <>
      <TitleBar title="Tesseract AI" onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 min-h-0 w-full">
        <Sidebar className="border-r">

          {/* Header */}
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <span className="text-md font-normal tracking-tight">Tesseract AI</span>
            </div>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="gap-0 py-2">
            <SidebarGroup className="py-0">
              <SidebarGroupContent>
                <SidebarMenu>

                  {/* Home */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/'}
                      className="h-9 px-3"
                    >
                      <Link to="/">
                        <Home className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Home</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarSeparator className="my-1" />

                  {/* Quick-create items */}
                  {quickCreateItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.url}
                          className="h-9 px-3 group/item"
                        >
                          <Link to={item.url}>
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate">{item.title}</span>
                            <span className="text-xs text-muted-foreground/20 group-hover/item:text-muted-foreground/50">
                              {item.shortcut}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}

                  <SidebarSeparator className="my-1" />

                  {/* Posts, Writing, Notes, Messages — collapsible section headers */}
                  {topNavSections.map((section) => {
                    const isOpen = sectionsOpen[section]
                    return (
                      <SidebarMenuItem key={section}>
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
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton className="text-muted-foreground/50 italic">
                                <span>Create new</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    )
                  })}

                  {/* Documents — collapsible */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isDocsActive}
                      className="h-9 px-3"
                      onClick={() => setDocsOpen((v) => !v)}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">Documents</span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200 ${docsOpen ? 'rotate-90' : ''}`}
                      />
                    </SidebarMenuButton>

                    {docsOpen && (
                      <SidebarMenuSub>
                        {documentSubItems.map((sub) => {
                          const Icon = sub.icon
                          return (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === sub.url}
                              >
                                <Link to={sub.url}>
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>

                  {/* Integrations */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/integrations'}
                      className="h-9 px-3"
                    >
                      <Link to="/integrations">
                        <Puzzle className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Integrations</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer — Settings popover */}
          <SidebarFooter className="border-t px-3 py-3">
            <SettingsPopover />
          </SidebarFooter>

        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 min-h-0">
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>
        </SidebarInset>
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
      <SidebarProvider className="flex-col flex-1 min-h-0">
        <AppLayoutInner>{children}</AppLayoutInner>
      </SidebarProvider>
    </div>
  )
}
