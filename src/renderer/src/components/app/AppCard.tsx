import React from 'react'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent
} from '../ui/card'
import { cn } from '@/lib/utils'

const AppCard = React.memo(
  React.forwardRef<React.ElementRef<typeof Card>, React.ComponentPropsWithoutRef<typeof Card>>(
    ({ className, ...props }, ref) => (
      <Card ref={ref} className={cn('border-border bg-card text-card-foreground', className)} {...props} />
    )
  )
)
AppCard.displayName = 'AppCard'

const AppCardHeader = React.memo(
  React.forwardRef<React.ElementRef<typeof CardHeader>, React.ComponentPropsWithoutRef<typeof CardHeader>>(
    ({ className, ...props }, ref) => (
      <CardHeader ref={ref} className={cn('text-card-foreground', className)} {...props} />
    )
  )
)
AppCardHeader.displayName = 'AppCardHeader'

const AppCardFooter = React.memo(
  React.forwardRef<React.ElementRef<typeof CardFooter>, React.ComponentPropsWithoutRef<typeof CardFooter>>(
    ({ className, ...props }, ref) => (
      <CardFooter ref={ref} className={cn('border-border', className)} {...props} />
    )
  )
)
AppCardFooter.displayName = 'AppCardFooter'

const AppCardTitle = React.memo(
  React.forwardRef<React.ElementRef<typeof CardTitle>, React.ComponentPropsWithoutRef<typeof CardTitle>>(
    ({ className, ...props }, ref) => (
      <CardTitle ref={ref} className={cn('text-card-foreground', className)} {...props} />
    )
  )
)
AppCardTitle.displayName = 'AppCardTitle'

const AppCardDescription = React.memo(
  React.forwardRef<React.ElementRef<typeof CardDescription>, React.ComponentPropsWithoutRef<typeof CardDescription>>(
    ({ className, ...props }, ref) => (
      <CardDescription ref={ref} className={cn('text-muted-foreground', className)} {...props} />
    )
  )
)
AppCardDescription.displayName = 'AppCardDescription'

const AppCardContent = React.memo(
  React.forwardRef<React.ElementRef<typeof CardContent>, React.ComponentPropsWithoutRef<typeof CardContent>>(
    ({ className, ...props }, ref) => (
      <CardContent ref={ref} className={cn('text-card-foreground', className)} {...props} />
    )
  )
)
AppCardContent.displayName = 'AppCardContent'

export {
  AppCard,
  AppCardHeader,
  AppCardFooter,
  AppCardTitle,
  AppCardDescription,
  AppCardContent
}
