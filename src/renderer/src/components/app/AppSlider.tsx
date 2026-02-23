import React from 'react'
import { Slider } from '../ui/slider'
import { cn } from '@/lib/utils'
import type { SliderProps } from '../ui/slider'

const AppSlider = React.memo(
  React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, ...props }, ref) => (
      <Slider ref={ref} className={cn('bg-muted', className)} {...props} />
    )
  )
)
AppSlider.displayName = 'AppSlider'

export { AppSlider }
