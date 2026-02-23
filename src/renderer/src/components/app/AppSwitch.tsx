import React from 'react'
import { Switch } from '../ui/switch'
import { cn } from '@/lib/utils'
import type { SwitchProps } from '../ui/switch'

const AppSwitch = React.memo(
  React.forwardRef<HTMLButtonElement, SwitchProps>(
    ({ className, ...props }, ref) => (
      <Switch ref={ref} className={cn(className)} {...props} />
    )
  )
)
AppSwitch.displayName = 'AppSwitch'

export { AppSwitch }
