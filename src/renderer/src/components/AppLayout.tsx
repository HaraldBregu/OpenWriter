import React from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  Download
} from 'lucide-react'
import { useUpdate } from '@/hooks/useUpdate'

interface AppLayoutProps {
  children: React.ReactNode
}

const mainMenuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    url: '/'
  }
]

const mediaDriverItems = [
  {
    title: 'Microphone',
    icon: Mic,
    url: '/microphone',
    description: 'Audio recording'
  },
  {
    title: 'Camera',
    icon: Camera,
    url: '/camera',
    description: 'Video recording'
  },
  {
    title: 'Screen',
    icon: Monitor,
    url: '/screen',
    description: 'Screen capture'
  }
]

const deviceDriverItems = [
  {
    title: 'Bluetooth',
    icon: Bluetooth,
    url: '/bluetooth',
    description: 'Bluetooth devices',
    disabled: false
  },
  {
    title: 'Audio Output',
    icon: Headphones,
    url: '#',
    description: 'Speaker & headphones',
    disabled: true
  },
  {
    title: 'Network',
    icon: Wifi,
    url: '/network',
    description: 'Internet and network connections',
    disabled: false
  },
  {
    title: 'Storage',
    icon: HardDrive,
    url: '#',
    description: 'Disk management',
    disabled: true
  }
]

const toolsItems = [
  {
    title: 'Cron Jobs',
    icon: Calendar,
    url: '/cron',
    disabled: false
  },
  {
    title: 'Lifecycle',
    icon: Activity,
    url: '/lifecycle',
    disabled: false
  },
  {
    title: 'Windows',
    icon: AppWindow,
    url: '/windows',
    disabled: false
  },
  {
    title: 'Filesystem',
    icon: FileText,
    url: '/filesystem',
    disabled: false
  },
  {
    title: 'Dialogs',
    icon: MessageSquare,
    url: '/dialogs',
    disabled: false
  },
  {
    title: 'Clipboard',
    icon: Clipboard,
    url: '/clipboard',
    disabled: false
  },
  {
    title: 'Auto-Update',
    icon: Download,
    url: '/update-simulator',
    disabled: false
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    url: '#',
    disabled: true
  }
]

const bottomMenuItems = [
  {
    title: 'Notifications',
    icon: Bell,
    url: '/notifications',
    disabled: false
  },
  {
    title: 'Privacy',
    icon: Shield,
    url: '#',
    disabled: true
  }
]

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const { version } = useUpdate()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          {/* Header */}
          <SidebarHeader className="border-b px-6 py-3">
            <h2 className="text-sm font-semibold">Tesseract</h2>
          </SidebarHeader>

          <SidebarContent>
            {/* Main Menu */}
            <SidebarGroup className="mb-3">
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainMenuItems.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} className="h-8">
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Media Drivers */}
            <SidebarGroup className="mb-3">
              <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground">
                Media
              </SidebarGroupLabel>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu>
                  {mediaDriverItems.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="h-8"
                          tooltip={item.description}
                        >
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Device Drivers */}
            <SidebarGroup className="mb-3">
              <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground">
                Devices
              </SidebarGroupLabel>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu>
                  {deviceDriverItems.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                          <SidebarMenuButton
                            disabled
                            className="h-8"
                            tooltip={item.description}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className="h-8"
                            tooltip={item.description}
                          >
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Tools */}
            <SidebarGroup className="mb-3">
              <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground">
                Tools
              </SidebarGroupLabel>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu>
                  {toolsItems.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                          <SidebarMenuButton disabled className="h-8">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton asChild isActive={isActive} className="h-8">
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Bottom Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {bottomMenuItems.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                          <SidebarMenuButton disabled className="h-8">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton asChild isActive={isActive} className="h-8">
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
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

          {/* Footer with Settings + Version */}
          <SidebarFooter className="border-t px-2 py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/settings'}
                  className="h-8"
                >
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="mt-2 px-2 text-[10px] text-muted-foreground">
              {version ? `v${version}` : ''}
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-12 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Tesseract</h1>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/30">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
