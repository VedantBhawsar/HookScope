"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

interface PasswordFieldProps {
  id: string
  label: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  minLength?: number
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  placeholder,
  minLength,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          required
          className="h-11 w-full rounded-md border border-input bg-background px-3 pr-11 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export { PasswordField }