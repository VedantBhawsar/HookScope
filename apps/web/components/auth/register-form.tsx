"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import { useRegisterMutation } from "@/hooks/use-auth"
import { PasswordField } from "@/components/auth/password-field"

function RegisterForm() {
  const router = useRouter()
  const registerMutation = useRegisterMutation()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }

    setFormError(null)

    try {
      const result = await registerMutation.mutateAsync({
        name,
        email,
        password,
      })
      const destination = result.user.onboarding?.onboardingCompleted ? "/projects" : "/onboarding?step=verify"
      router.push(destination)
      router.refresh()
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  const errorMessage = formError

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field
        id="name"
        label="Full name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={setName}
        placeholder="Alex Carter"
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        placeholder="you@company.com"
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        minLength={8}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Re-enter your password"
        minLength={8}
      />

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  type: React.HTMLInputTypeAttribute
  autoComplete: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  minLength?: number
}

function Field({ id, label, type, autoComplete, value, onChange, placeholder, minLength }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        minLength={minLength}
        required
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
      />
    </div>
  )
}

export { RegisterForm }
