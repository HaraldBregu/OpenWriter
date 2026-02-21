import React from 'react'
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription
} from '../ui/sheet'
import { cn } from '@/lib/utils'

const AppSheet = Sheet
const AppSheetPortal = SheetPortal
const AppSheetTrigger = SheetTrigger
const AppSheetClose = SheetClose

const AppSheetOverlay = React.memo(
  React.forwardRef<React.ElementRef<typeof SheetOverlay>, React.ComponentPropsWithoutRef<typeof SheetOverlay>>(
    ({ className, ...props }, ref) => (
      <SheetOverlay ref={ref} className={cn('bg-background/80', className)} {...props} />
    )
  )
)
AppSheetOverlay.displayName = 'AppSheetOverlay'

const AppSheetContent = React.memo(
  React.forwardRef<React.ElementRef<typeof SheetContent>, React.ComponentPropsWithoutRef<typeof SheetContent>>(
    ({ className, ...props }, ref) => (
      <SheetContent ref={ref} className={cn('border-border bg-background text-foreground', className)} {...props} />
    )
  )
)
AppSheetContent.displayName = 'AppSheetContent'

const AppSheetHeader = React.memo(function AppSheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <SheetHeader className={cn('text-foreground', className)} {...props} />
})
AppSheetHeader.displayName = 'AppSheetHeader'

const AppSheetFooter = React.memo(function AppSheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <SheetFooter className={cn('border-border', className)} {...props} />
})
AppSheetFooter.displayName = 'AppSheetFooter'

const AppSheetTitle = React.memo(
  React.forwardRef<React.ElementRef<typeof SheetTitle>, React.ComponentPropsWithoutRef<typeof SheetTitle>>(
    ({ className, ...props }, ref) => (
      <SheetTitle ref={ref} className={cn('text-foreground', className)} {...props} />
    )
  )
)
AppSheetTitle.displayName = 'AppSheetTitle'

const AppSheetDescription = React.memo(
  React.forwardRef<React.ElementRef<typeof SheetDescription>, React.ComponentPropsWithoutRef<typeof SheetDescription>>(
    ({ className, ...props }, ref) => (
      <SheetDescription ref={ref} className={cn('text-muted-foreground', className)} {...props} />
    )
  )
)
AppSheetDescription.displayName = 'AppSheetDescription'

export {
  AppSheet,
  AppSheetPortal,
  AppSheetOverlay,
  AppSheetTrigger,
  AppSheetClose,
  AppSheetContent,
  AppSheetHeader,
  AppSheetFooter,
  AppSheetTitle,
  AppSheetDescription
}
