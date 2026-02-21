import React from 'react'
import { Button, buttonVariants, type ButtonProps } from '../ui/button'
import { cn } from '@/lib/utils'

const AppButton = React.memo(
  React.forwardRef<React.ElementRef<typeof Button>, React.ComponentPropsWithoutRef<typeof Button>>(
    ({ className, ...props }, ref) => (
      <Button ref={ref} className={cn('transition-colors focus-visible:ring-ring', className)} {...props} />
    )
  )
)
AppButton.displayName = 'AppButton'

export { AppButton, buttonVariants }
export type { ButtonProps }
