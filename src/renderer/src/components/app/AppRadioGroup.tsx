import React from 'react'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { cn } from '@/lib/utils'

const AppRadioGroup = React.memo(
  React.forwardRef<React.ElementRef<typeof RadioGroup>, React.ComponentPropsWithoutRef<typeof RadioGroup>>(
    ({ className, ...props }, ref) => (
      <RadioGroup ref={ref} className={cn('text-foreground', className)} {...props} />
    )
  )
)
AppRadioGroup.displayName = 'AppRadioGroup'

const AppRadioGroupItem = React.memo(
  React.forwardRef<React.ElementRef<typeof RadioGroupItem>, React.ComponentPropsWithoutRef<typeof RadioGroupItem>>(
    ({ className, ...props }, ref) => (
      <RadioGroupItem ref={ref} className={cn('border-primary text-primary', className)} {...props} />
    )
  )
)
AppRadioGroupItem.displayName = 'AppRadioGroupItem'

export { AppRadioGroup, AppRadioGroupItem }
