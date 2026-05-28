"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { LoaderCircle } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import { Input } from "@hookscope/ui/components/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hookscope/ui/components/form"
import { toast } from "@hookscope/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import { useRegisterMutation } from "@/hooks/use-auth"
import { PasswordField } from "@/components/auth/password-field"

interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

function RegisterForm() {
  const router = useRouter()
  const registerMutation = useRegisterMutation()
  const form = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    form.clearErrors("root")

    try {
      const result = await registerMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      const destination = result.user.onboarding?.onboardingCompleted ? "/projects" : "/onboarding?step=verify"
      router.push(destination)
      router.refresh()
    } catch (error) {
      const message = getRequestErrorMessage(error)
      form.setError("root", { type: "server", message })
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          rules={{
            required: "Full name is required",
            validate: (value) => (value.trim().length > 0 ? true : "Full name is required"),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Alex Carter" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          rules={{
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          rules={{
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordField
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    if (form.getValues("confirmPassword")) {
                      void form.trigger("confirmPassword")
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          rules={{
            required: "Please confirm your password",
            validate: (value) => (value === form.getValues("password") ? true : "Passwords do not match"),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordField
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root?.message ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {form.formState.errors.root.message}
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
    </Form>
  )
}

export { RegisterForm }
