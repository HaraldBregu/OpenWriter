import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  Mic,
  Camera,
  Monitor,
  Settings,
  Headphones,
  HardDrive,
  Wifi,
  Bluetooth,
  Activity,
  AppWindow,
  Calendar,
  FileText,
  MessageSquare,
  BarChart3,
  Bell,
  Shield,
  Clipboard,
  Download,
  PenLine,
  BookMarked,
  Send,
  Image,
  Film,
  File,
  BookOpen,
  ChevronRight,
  Sun,
  LogOut,
  Cpu,
  User,
  Star,
  UserCog,
  CreditCard,
  Bell as BellIcon,
  ChevronUp
} from 'lucide-react'
import { useUpdate } from '@/hooks/useUpdate'

interface AppLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  title: string
  icon: React.ElementType
  url: string
  disabled?: boolean
  description?: string
  count?: number
}

interface NavGroup {
  label: string
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
  // {
  //   label: 'MEDIA',
  //   items: [
  //     { title: 'Microphone', icon: Mic, url: '/microphone', description: 'Audio recording' },
  //     { title: 'Camera', icon: Camera, url: '/camera', description: 'Video recording' },
  //     { title: 'Screen', icon: Monitor, url: '/screen', description: 'Screen capture' }
  //   ]
  // },
  // {
  //   label: 'DEVICES',
  //   items: [
  //     { title: 'Bluetooth', icon: Bluetooth, url: '/bluetooth' },
  //     { title: 'Audio Output', icon: Headphones, url: '#', disabled: true },
  //     { title: 'Network', icon: Wifi, url: '/network' },
  //     { title: 'Storage', icon: HardDrive, url: '#', disabled: true }
  //   ]
  // },
  // {
  //   label: 'TOOLS',
  //   items: [
  //     { title: 'Cron Jobs', icon: Calendar, url: '/cron' },
  //     { title: 'Lifecycle', icon: Activity, url: '/lifecycle' },
  //     { title: 'Windows', icon: AppWindow, url: '/windows' },
  //     { title: 'Filesystem', icon: FileText, url: '/filesystem' },
  //     { title: 'Dialogs', icon: MessageSquare, url: '/dialogs' },
  //     { title: 'Clipboard', icon: Clipboard, url: '/clipboard' },
  //     { title: 'Auto-Update', icon: Download, url: '/update-simulator' },
  //     { title: 'Analytics', icon: BarChart3, url: '#', disabled: true }
  //   ]
  // },
  // {
  //   label: 'SYSTEM',
  //   items: [
  //     { title: 'Notifications', icon: Bell, url: '/notifications' },
  //     { title: 'Privacy', icon: Shield, url: '#', disabled: true }
  //   ]
  // }
]

function NavGroupSection({
  group,
  currentPath
}: {
  group: NavGroup
  currentPath: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <SidebarGroup className="mb-4 py-0">
      {/* Section label — clickable to collapse */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center px-3 py-2 text-xs font-normal tracking-widest text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors"
      >
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
              const inner = (
                <>
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
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

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const [footerOpen, setFooterOpen] = useState(true)

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

            {/* Dynamic nav groups */}
            {navGroups.map((group) => (
              <NavGroupSection key={group.label} group={group} currentPath={location.pathname} />
            ))}
          </SidebarContent>

          {/* Footer — User Profile */}
          <SidebarFooter className="border-t px-3 py-3 gap-2">

            {/* User Profile Card — Dropdown Trigger */}
            <button
              onClick={() => setFooterOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent/50 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal truncate">Tesseract User</p>
                <p className="text-xs text-muted-foreground truncate">user@tesseract.ai</p>
              </div>

              {/* Expand/Collapse Chevron */}
              <ChevronUp
                className={`h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform ${footerOpen ? '' : '-rotate-180'}`}
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
