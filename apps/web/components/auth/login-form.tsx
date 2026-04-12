"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import { useLoginMutation } from "@/hooks/use-auth"
import { PasswordField } from "@/components/auth/password-field"

function LoginForm() {
  const router = useRouter()
  const loginMutation = useLoginMutation()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const result = await loginMutation.mutateAsync({
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

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        placeholder="you@company.com"
      />
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <PasswordField
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>
      <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/auth/register" className="font-medium text-foreground underline underline-offset-4">
          Create an account
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
}

function Field({ id, label, type, autoComplete, value, onChange, placeholder }: FieldProps) {
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
        required
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
      />
    </div>
  )
}

export { LoginForm }
