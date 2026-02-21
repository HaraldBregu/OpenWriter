import React from 'react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '../ui/tooltip'
import { cn } from '@/lib/utils'

const AppTooltip = Tooltip
const AppTooltipTrigger = TooltipTrigger
const AppTooltipProvider = TooltipProvider

const AppTooltipContent = React.memo(
  React.forwardRef<React.ElementRef<typeof TooltipContent>, React.ComponentPropsWithoutRef<typeof TooltipContent>>(
    ({ className, ...props }, ref) => (
      <TooltipContent ref={ref} className={cn('border-border bg-popover text-popover-foreground', className)} {...props} />
    )
  )
)
AppTooltipContent.displayName = 'AppTooltipContent'

export { AppTooltip, AppTooltipTrigger, AppTooltipContent, AppTooltipProvider }
