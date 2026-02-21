import React from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup
} from '../ui/dropdown-menu'
import { cn } from '@/lib/utils'

const AppDropdownMenu = DropdownMenu
const AppDropdownMenuTrigger = DropdownMenuTrigger
const AppDropdownMenuGroup = DropdownMenuGroup
const AppDropdownMenuPortal = DropdownMenuPortal
const AppDropdownMenuSub = DropdownMenuSub
const AppDropdownMenuRadioGroup = DropdownMenuRadioGroup

const AppDropdownMenuContent = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuContent>, React.ComponentPropsWithoutRef<typeof DropdownMenuContent>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuContent ref={ref} className={cn('border-border bg-popover text-popover-foreground', className)} {...props} />
    )
  )
)
AppDropdownMenuContent.displayName = 'AppDropdownMenuContent'

const AppDropdownMenuItem = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuItem>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuItem ref={ref} className={cn('text-foreground focus:bg-accent focus:text-accent-foreground', className)} {...props} />
    )
  )
)
AppDropdownMenuItem.displayName = 'AppDropdownMenuItem'

const AppDropdownMenuCheckboxItem = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuCheckboxItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuCheckboxItem>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuCheckboxItem ref={ref} className={cn('text-foreground focus:bg-accent focus:text-accent-foreground', className)} {...props} />
    )
  )
)
AppDropdownMenuCheckboxItem.displayName = 'AppDropdownMenuCheckboxItem'

const AppDropdownMenuRadioItem = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuRadioItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuRadioItem>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuRadioItem ref={ref} className={cn('text-foreground focus:bg-accent focus:text-accent-foreground', className)} {...props} />
    )
  )
)
AppDropdownMenuRadioItem.displayName = 'AppDropdownMenuRadioItem'

const AppDropdownMenuLabel = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuLabel>, React.ComponentPropsWithoutRef<typeof DropdownMenuLabel>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuLabel ref={ref} className={cn('text-foreground', className)} {...props} />
    )
  )
)
AppDropdownMenuLabel.displayName = 'AppDropdownMenuLabel'

const AppDropdownMenuSeparator = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuSeparator>, React.ComponentPropsWithoutRef<typeof DropdownMenuSeparator>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuSeparator ref={ref} className={cn('bg-border', className)} {...props} />
    )
  )
)
AppDropdownMenuSeparator.displayName = 'AppDropdownMenuSeparator'

const AppDropdownMenuShortcut = React.memo(function AppDropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <DropdownMenuShortcut className={cn('text-muted-foreground', className)} {...props} />
})
AppDropdownMenuShortcut.displayName = 'AppDropdownMenuShortcut'

const AppDropdownMenuSubContent = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuSubContent>, React.ComponentPropsWithoutRef<typeof DropdownMenuSubContent>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuSubContent ref={ref} className={cn('border-border bg-popover text-popover-foreground', className)} {...props} />
    )
  )
)
AppDropdownMenuSubContent.displayName = 'AppDropdownMenuSubContent'

const AppDropdownMenuSubTrigger = React.memo(
  React.forwardRef<React.ElementRef<typeof DropdownMenuSubTrigger>, React.ComponentPropsWithoutRef<typeof DropdownMenuSubTrigger>>(
    ({ className, ...props }, ref) => (
      <DropdownMenuSubTrigger ref={ref} className={cn('text-foreground focus:bg-accent', className)} {...props} />
    )
  )
)
AppDropdownMenuSubTrigger.displayName = 'AppDropdownMenuSubTrigger'

export {
  AppDropdownMenu,
  AppDropdownMenuTrigger,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuCheckboxItem,
  AppDropdownMenuRadioItem,
  AppDropdownMenuLabel,
  AppDropdownMenuSeparator,
  AppDropdownMenuShortcut,
  AppDropdownMenuGroup,
  AppDropdownMenuPortal,
  AppDropdownMenuSub,
  AppDropdownMenuSubContent,
  AppDropdownMenuSubTrigger,
  AppDropdownMenuRadioGroup
}
