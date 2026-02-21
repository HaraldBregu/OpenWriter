import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { cn } from '@/lib/utils'

const AppSkeleton = React.memo(function AppSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('bg-muted', className)} {...props} />
})
AppSkeleton.displayName = 'AppSkeleton'

export { AppSkeleton }
