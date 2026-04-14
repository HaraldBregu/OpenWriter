import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/Card"

interface IMGProps extends React.ComponentProps<"img"> {
  caption?: string
  description?: string
  size?: "default" | "sm"
  cardClassName?: string
}

function IMG({
  className,
  caption,
  description,
  size,
  cardClassName,
  alt = "",
  ...props
}: IMGProps) {
  return (
    <Card size={size} className={cardClassName}>
      <img
        data-slot="image"
        className={cn("w-full object-cover", className)}
        alt={alt}
        {...props}
      />
      {(caption || description) && (
        <CardContent>
          {caption && <CardTitle>{caption}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardContent>
      )}
    </Card>
  )
}

export { IMG }
export type { IMGProps }
