import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = {
  default: "bg-violet-600 text-white hover:bg-violet-500 shadow-sm",
  outline: "border border-neutral-700 bg-transparent hover:bg-neutral-800 text-neutral-200",
  ghost: "hover:bg-white/10 text-neutral-300",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  link: "text-violet-400 underline-offset-4 hover:underline",
}

const buttonSizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-8",
  icon: "h-9 w-9",
}

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        buttonVariants[variant] || buttonVariants.default,
        buttonSizes[size] || buttonSizes.default,
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"
export { Button }
