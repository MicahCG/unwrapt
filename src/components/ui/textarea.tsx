
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-lg border border-brand-cream bg-white px-4 py-3 text-base text-brand-charcoal placeholder:text-brand-charcoal/50 focus:border-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-charcoal/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-vertical",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
