import * as React from "react"
import { cn } from "src/renderer/src/lib/utils"

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const handleClick = React.useCallback(() => {
      if (!disabled) {
        onCheckedChange?.(!checked)
      }
    }, [checked, disabled, onCheckedChange])

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-foreground" : "bg-muted",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4 bg-background" : "translate-x-0 bg-foreground"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
