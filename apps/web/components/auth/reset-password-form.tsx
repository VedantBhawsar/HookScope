"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import Link from "next/link"
import { CheckCircle, LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form"
import { toast } from "@workspace/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import { useResetPasswordMutation } from "@/hooks/use-auth"
import { PasswordField } from "@/components/auth/password-field"
import * as React from "react"

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

interface ResetPasswordFormProps {
  token: string
}

function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const mutation = useResetPasswordMutation()
  const [done, setDone] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await mutation.mutateAsync({ token, password: values.password })
      setDone(true)
      toast.success(result.message)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="size-6 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Password updated</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new password.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-destructive">Missing reset token. Please use the link from your email.</p>
        <Link href="/auth/forgot-password" className="mt-3 inline-block text-sm underline underline-offset-4">
          Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordField
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <PasswordField
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  {...field}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {mutation.isPending ? "Updating..." : "Set new password"}
        </Button>
      </form>
    </Form>
  )
}

export { ResetPasswordForm }
