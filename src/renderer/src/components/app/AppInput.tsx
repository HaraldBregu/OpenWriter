import React from 'react'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'

const AppInput = React.memo(
  React.forwardRef<React.ElementRef<typeof Input>, React.ComponentPropsWithoutRef<typeof Input>>(
    ({ className, ...props }, ref) => (
      <Input ref={ref} className={cn('border-input bg-background text-foreground placeholder:text-muted-foreground', className)} {...props} />
    )
  )
)
AppInput.displayName = 'AppInput'

export { AppInput }
