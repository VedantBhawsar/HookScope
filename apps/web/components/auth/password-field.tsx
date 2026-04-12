"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

type PasswordFieldProps = Omit<React.ComponentProps<typeof Input>, "type">

const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { className, ...props },
  ref
) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input ref={ref} type={isVisible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsVisible((current) => !current)}
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  )
})

export { PasswordField }