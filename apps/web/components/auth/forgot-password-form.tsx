"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import Link from "next/link"
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import { useForgotPasswordMutation } from "@/hooks/use-auth"
import * as React from "react"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
})

type FormValues = z.infer<typeof schema>

function ForgotPasswordForm() {
  const mutation = useForgotPasswordMutation()
  const [submitted, setSubmitted] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await mutation.mutateAsync(values.email)
      setSubmitted(true)
      toast.success(result.message)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="size-6 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If <strong>{form.getValues("email")}</strong> is registered, you&apos;ll receive a reset link shortly.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {mutation.isPending ? "Sending..." : "Send reset link"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}

export { ForgotPasswordForm }
