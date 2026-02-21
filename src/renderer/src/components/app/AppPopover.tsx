import React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover'
import { cn } from '@/lib/utils'

const AppPopover = Popover
const AppPopoverTrigger = PopoverTrigger

const AppPopoverContent = React.memo(
  React.forwardRef<React.ElementRef<typeof PopoverContent>, React.ComponentPropsWithoutRef<typeof PopoverContent>>(
    ({ className, ...props }, ref) => (
      <PopoverContent ref={ref} className={cn('border-border bg-popover text-popover-foreground', className)} {...props} />
    )
  )
)
AppPopoverContent.displayName = 'AppPopoverContent'

export { AppPopover, AppPopoverTrigger, AppPopoverContent }
