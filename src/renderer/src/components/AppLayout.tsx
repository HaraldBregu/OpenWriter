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
import { Separator } from './ui/separator'
import {
  Home,
  Mic,
  Camera,
  Monitor,
  Settings,
  Video,
  Headphones,
  Wifi,
  HardDrive,
  FileText,
  Clock,
  BarChart3,
  Bell,
  Shield,
  HelpCircle,
  Info
} from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

const mainMenuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    url: '/',
    badge: null
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
    title: 'Audio Output',
    icon: Headphones,
    url: '#',
    description: 'Speaker & headphones',
    disabled: true
  },
  {
    title: 'Network',
    icon: Wifi,
    url: '#',
    description: 'WiFi & Ethernet',
    disabled: true
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
    title: 'Files',
    icon: FileText,
    url: '#',
    disabled: true
  },
  {
    title: 'History',
    icon: Clock,
    url: '#',
    disabled: true
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
    url: '#',
    badge: '3',
    disabled: true
  },
  {
    title: 'Privacy',
    icon: Shield,
    url: '#',
    disabled: true
  },
  {
    title: 'Settings',
    icon: Settings,
    url: '/settings'
  }
]

const footerItems = [
  {
    title: 'Help & Support',
    icon: HelpCircle,
    url: '#',
    disabled: true
  },
  {
    title: 'About',
    icon: Info,
    url: '#',
    disabled: true
  }
]

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          {/* Header */}
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold">Tesseract</h2>
                <p className="text-xs text-muted-foreground">Media Center</p>
              </div>
            </div>
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
                        <SidebarMenuButton asChild isActive={isActive} className="h-10">
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span className="font-medium">{item.title}</span>
                            {item.badge && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
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
                Media Drivers
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
                          className="h-10"
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
                Device Drivers
              </SidebarGroupLabel>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu>
                  {deviceDriverItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        disabled={item.disabled}
                        className="h-10"
                        tooltip={item.description}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.disabled && (
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                  {toolsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton disabled={item.disabled} className="h-10">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.disabled && (
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="my-3" />

            {/* Bottom Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {bottomMenuItems.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                          <SidebarMenuButton disabled className="h-10">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                                {item.badge}
                              </span>
                            )}
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton asChild isActive={isActive} className="h-10">
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

          {/* Footer */}
          <SidebarFooter className="border-t px-2 py-2">
            <SidebarMenu>
              {footerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled={item.disabled} size="sm">
                    <item.icon className="h-4 w-4" />
                    <span className="text-xs">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-2 px-2 text-[10px] text-muted-foreground">
              v1.0.0
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Tesseract</h1>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Pro
              </span>
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
