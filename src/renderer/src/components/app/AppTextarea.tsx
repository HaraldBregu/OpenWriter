import React from 'react'
import { Textarea } from '../ui/textarea'
import { cn } from '@/lib/utils'

const AppTextarea = React.memo(
  React.forwardRef<React.ElementRef<typeof Textarea>, React.ComponentPropsWithoutRef<typeof Textarea>>(
    ({ className, ...props }, ref) => (
      <Textarea ref={ref} className={cn('border-input bg-background text-foreground placeholder:text-muted-foreground', className)} {...props} />
    )
  )
)
AppTextarea.displayName = 'AppTextarea'

export { AppTextarea }
