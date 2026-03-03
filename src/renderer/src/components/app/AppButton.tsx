import React from 'react'
import { cva } from 'class-variance-authority'
import { Button, buttonVariants as baseButtonVariants, type ButtonProps } from '../ui/button'
import { cn } from '@/lib/utils'

const buttonVariants = cva(baseButtonVariants(), {
  variants: {
    size: {
      'icon-lg': 'h-10 w-10 rounded-full p-0 [&_svg]:size-5',
      icon: 'h-8 w-8 rounded-full p-0 [&_svg]:size-4',
      'icon-sm': 'h-7 w-7 rounded-full p-0 [&_svg]:size-[17px]',
      'icon-xm': 'h-6 w-6 rounded p-0 [&_svg]:size-[15px]',
    },
  },
})

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
