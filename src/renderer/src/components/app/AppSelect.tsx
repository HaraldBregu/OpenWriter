import React from 'react'
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton
} from '../ui/select'
import { cn } from '@/lib/utils'

const AppSelect = Select
const AppSelectGroup = SelectGroup
const AppSelectValue = SelectValue

const AppSelectTrigger = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectTrigger>, React.ComponentPropsWithoutRef<typeof SelectTrigger>>(
    ({ className, ...props }, ref) => (
      <SelectTrigger ref={ref} className={cn('border-input bg-background text-foreground', className)} {...props} />
    )
  )
)
AppSelectTrigger.displayName = 'AppSelectTrigger'

const AppSelectContent = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectContent>, React.ComponentPropsWithoutRef<typeof SelectContent>>(
    ({ className, ...props }, ref) => (
      <SelectContent ref={ref} className={cn('border-border bg-popover text-popover-foreground', className)} {...props} />
    )
  )
)
AppSelectContent.displayName = 'AppSelectContent'

const AppSelectLabel = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectLabel>, React.ComponentPropsWithoutRef<typeof SelectLabel>>(
    ({ className, ...props }, ref) => (
      <SelectLabel ref={ref} className={cn('text-foreground', className)} {...props} />
    )
  )
)
AppSelectLabel.displayName = 'AppSelectLabel'

const AppSelectItem = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectItem>, React.ComponentPropsWithoutRef<typeof SelectItem>>(
    ({ className, ...props }, ref) => (
      <SelectItem ref={ref} className={cn('text-foreground focus:bg-accent focus:text-accent-foreground', className)} {...props} />
    )
  )
)
AppSelectItem.displayName = 'AppSelectItem'

const AppSelectSeparator = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectSeparator>, React.ComponentPropsWithoutRef<typeof SelectSeparator>>(
    ({ className, ...props }, ref) => (
      <SelectSeparator ref={ref} className={cn('bg-border', className)} {...props} />
    )
  )
)
AppSelectSeparator.displayName = 'AppSelectSeparator'

const AppSelectScrollUpButton = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectScrollUpButton>, React.ComponentPropsWithoutRef<typeof SelectScrollUpButton>>(
    ({ className, ...props }, ref) => (
      <SelectScrollUpButton ref={ref} className={cn('text-foreground', className)} {...props} />
    )
  )
)
AppSelectScrollUpButton.displayName = 'AppSelectScrollUpButton'

const AppSelectScrollDownButton = React.memo(
  React.forwardRef<React.ElementRef<typeof SelectScrollDownButton>, React.ComponentPropsWithoutRef<typeof SelectScrollDownButton>>(
    ({ className, ...props }, ref) => (
      <SelectScrollDownButton ref={ref} className={cn('text-foreground', className)} {...props} />
    )
  )
)
AppSelectScrollDownButton.displayName = 'AppSelectScrollDownButton'

export {
  AppSelect,
  AppSelectGroup,
  AppSelectValue,
  AppSelectTrigger,
  AppSelectContent,
  AppSelectLabel,
  AppSelectItem,
  AppSelectSeparator,
  AppSelectScrollUpButton,
  AppSelectScrollDownButton
}
