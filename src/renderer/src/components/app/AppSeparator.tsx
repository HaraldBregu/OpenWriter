import React from 'react'
import { Separator } from '../ui/separator'
import { cn } from '@/lib/utils'

const AppSeparator = React.memo(
  React.forwardRef<React.ElementRef<typeof Separator>, React.ComponentPropsWithoutRef<typeof Separator>>(
    ({ className, ...props }, ref) => (
      <Separator ref={ref} className={cn('bg-border', className)} {...props} />
    )
  )
)
AppSeparator.displayName = 'AppSeparator'

export { AppSeparator }
