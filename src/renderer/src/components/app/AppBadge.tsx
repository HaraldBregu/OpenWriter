import React from 'react'
import { Badge, badgeVariants, type BadgeProps } from '../ui/badge'
import { cn } from '@/lib/utils'

const AppBadge = React.memo(function AppBadge({ className, ...props }: BadgeProps) {
  return <Badge className={cn('border-border text-foreground', className)} {...props} />
})
AppBadge.displayName = 'AppBadge'

export { AppBadge, badgeVariants }
export type { BadgeProps }
