import React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from '../ui/sidebar'
import { cn } from '@/lib/utils'

const AppSidebarProvider = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarProvider>, React.ComponentPropsWithoutRef<typeof SidebarProvider>>(
    ({ className, ...props }, ref) => (
      <SidebarProvider ref={ref} className={cn('bg-background text-foreground', className)} {...props} />
    )
  )
)
AppSidebarProvider.displayName = 'AppSidebarProvider'

const AppSidebar = React.memo(
  React.forwardRef<React.ElementRef<typeof Sidebar>, React.ComponentPropsWithoutRef<typeof Sidebar>>(
    ({ className, ...props }, ref) => (
      <Sidebar ref={ref} className={cn('bg-sidebar text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebar.displayName = 'AppSidebar'

const AppSidebarTrigger = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarTrigger>, React.ComponentPropsWithoutRef<typeof SidebarTrigger>>(
    ({ className, ...props }, ref) => (
      <SidebarTrigger ref={ref} className={cn('text-sidebar-foreground hover:bg-sidebar-accent', className)} {...props} />
    )
  )
)
AppSidebarTrigger.displayName = 'AppSidebarTrigger'

const AppSidebarRail = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarRail>, React.ComponentPropsWithoutRef<typeof SidebarRail>>(
    ({ className, ...props }, ref) => (
      <SidebarRail ref={ref} className={cn('hover:after:bg-sidebar-border', className)} {...props} />
    )
  )
)
AppSidebarRail.displayName = 'AppSidebarRail'

const AppSidebarInset = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarInset>, React.ComponentPropsWithoutRef<typeof SidebarInset>>(
    ({ className, ...props }, ref) => (
      <SidebarInset ref={ref} className={cn('bg-background', className)} {...props} />
    )
  )
)
AppSidebarInset.displayName = 'AppSidebarInset'

const AppSidebarInput = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarInput>, React.ComponentPropsWithoutRef<typeof SidebarInput>>(
    ({ className, ...props }, ref) => (
      <SidebarInput ref={ref} className={cn('bg-background text-foreground', className)} {...props} />
    )
  )
)
AppSidebarInput.displayName = 'AppSidebarInput'

const AppSidebarHeader = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarHeader>, React.ComponentPropsWithoutRef<typeof SidebarHeader>>(
    ({ className, ...props }, ref) => (
      <SidebarHeader ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarHeader.displayName = 'AppSidebarHeader'

const AppSidebarFooter = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarFooter>, React.ComponentPropsWithoutRef<typeof SidebarFooter>>(
    ({ className, ...props }, ref) => (
      <SidebarFooter ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarFooter.displayName = 'AppSidebarFooter'

const AppSidebarSeparator = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarSeparator>, React.ComponentPropsWithoutRef<typeof SidebarSeparator>>(
    ({ className, ...props }, ref) => (
      <SidebarSeparator ref={ref} className={cn('bg-sidebar-border', className)} {...props} />
    )
  )
)
AppSidebarSeparator.displayName = 'AppSidebarSeparator'

const AppSidebarContent = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarContent>, React.ComponentPropsWithoutRef<typeof SidebarContent>>(
    ({ className, ...props }, ref) => (
      <SidebarContent ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarContent.displayName = 'AppSidebarContent'

const AppSidebarGroup = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarGroup>, React.ComponentPropsWithoutRef<typeof SidebarGroup>>(
    ({ className, ...props }, ref) => (
      <SidebarGroup ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarGroup.displayName = 'AppSidebarGroup'

const AppSidebarGroupLabel = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarGroupLabel>, React.ComponentPropsWithoutRef<typeof SidebarGroupLabel>>(
    ({ className, ...props }, ref) => (
      <SidebarGroupLabel ref={ref} className={cn('text-sidebar-foreground/70', className)} {...props} />
    )
  )
)
AppSidebarGroupLabel.displayName = 'AppSidebarGroupLabel'

const AppSidebarGroupAction = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarGroupAction>, React.ComponentPropsWithoutRef<typeof SidebarGroupAction>>(
    ({ className, ...props }, ref) => (
      <SidebarGroupAction ref={ref} className={cn('text-sidebar-foreground hover:bg-sidebar-accent', className)} {...props} />
    )
  )
)
AppSidebarGroupAction.displayName = 'AppSidebarGroupAction'

const AppSidebarGroupContent = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarGroupContent>, React.ComponentPropsWithoutRef<typeof SidebarGroupContent>>(
    ({ className, ...props }, ref) => (
      <SidebarGroupContent ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarGroupContent.displayName = 'AppSidebarGroupContent'

const AppSidebarMenu = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenu>, React.ComponentPropsWithoutRef<typeof SidebarMenu>>(
    ({ className, ...props }, ref) => (
      <SidebarMenu ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarMenu.displayName = 'AppSidebarMenu'

const AppSidebarMenuItem = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuItem>, React.ComponentPropsWithoutRef<typeof SidebarMenuItem>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuItem ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarMenuItem.displayName = 'AppSidebarMenuItem'

const AppSidebarMenuButton = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuButton>, React.ComponentPropsWithoutRef<typeof SidebarMenuButton>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuButton ref={ref} className={cn('text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', className)} {...props} />
    )
  )
)
AppSidebarMenuButton.displayName = 'AppSidebarMenuButton'

const AppSidebarMenuAction = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuAction>, React.ComponentPropsWithoutRef<typeof SidebarMenuAction>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuAction ref={ref} className={cn('text-sidebar-foreground hover:bg-sidebar-accent', className)} {...props} />
    )
  )
)
AppSidebarMenuAction.displayName = 'AppSidebarMenuAction'

const AppSidebarMenuBadge = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuBadge>, React.ComponentPropsWithoutRef<typeof SidebarMenuBadge>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuBadge ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarMenuBadge.displayName = 'AppSidebarMenuBadge'

const AppSidebarMenuSkeleton = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuSkeleton>, React.ComponentPropsWithoutRef<typeof SidebarMenuSkeleton>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuSkeleton ref={ref} className={cn('bg-sidebar-accent', className)} {...props} />
    )
  )
)
AppSidebarMenuSkeleton.displayName = 'AppSidebarMenuSkeleton'

const AppSidebarMenuSub = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuSub>, React.ComponentPropsWithoutRef<typeof SidebarMenuSub>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuSub ref={ref} className={cn('border-sidebar-border', className)} {...props} />
    )
  )
)
AppSidebarMenuSub.displayName = 'AppSidebarMenuSub'

const AppSidebarMenuSubItem = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuSubItem>, React.ComponentPropsWithoutRef<typeof SidebarMenuSubItem>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuSubItem ref={ref} className={cn('text-sidebar-foreground', className)} {...props} />
    )
  )
)
AppSidebarMenuSubItem.displayName = 'AppSidebarMenuSubItem'

const AppSidebarMenuSubButton = React.memo(
  React.forwardRef<React.ElementRef<typeof SidebarMenuSubButton>, React.ComponentPropsWithoutRef<typeof SidebarMenuSubButton>>(
    ({ className, ...props }, ref) => (
      <SidebarMenuSubButton ref={ref} className={cn('text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', className)} {...props} />
    )
  )
)
AppSidebarMenuSubButton.displayName = 'AppSidebarMenuSubButton'

export {
  AppSidebar,
  AppSidebarContent,
  AppSidebarFooter,
  AppSidebarGroup,
  AppSidebarGroupAction,
  AppSidebarGroupContent,
  AppSidebarGroupLabel,
  AppSidebarHeader,
  AppSidebarInput,
  AppSidebarInset,
  AppSidebarMenu,
  AppSidebarMenuAction,
  AppSidebarMenuBadge,
  AppSidebarMenuButton,
  AppSidebarMenuItem,
  AppSidebarMenuSkeleton,
  AppSidebarMenuSub,
  AppSidebarMenuSubButton,
  AppSidebarMenuSubItem,
  AppSidebarProvider,
  AppSidebarRail,
  AppSidebarSeparator,
  AppSidebarTrigger,
  useSidebar
}
