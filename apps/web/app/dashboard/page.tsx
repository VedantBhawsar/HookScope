"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { LoaderCircle, LogOut } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"

export default function DashboardPage() {
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()

  React.useEffect(() => {
    const user = meQuery.data?.user
    if (!user) return

    if (!user.onboarding?.onboardingCompleted) {
      router.replace("/onboarding?step=verify")
    }
  }, [meQuery.data?.user, router])

  if (meQuery.isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading profile...
        </div>
      </section>
    )
  }

  const user = meQuery.data?.user

  if (!user) {
    return (
      <section className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold">You are not signed in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to access your workspace dashboard.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/register">Create account</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (!user.onboarding?.onboardingCompleted) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Redirecting to onboarding...
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Authenticated</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Hello, {user.name}</h1>
          <p className="mt-2 text-muted-foreground">{user.email}</p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold">Session actions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You can now connect projects and inspect event streams. For now, auth wiring is ready.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                logoutMutation.mutate()
              }}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Sign out
            </Button>
            <Button asChild>
              <Link href="/auth/login">Go to auth pages</Link>
            </Button>
          </div>

          {meQuery.error ? (
            <p className="mt-4 text-sm text-destructive">{getRequestErrorMessage(meQuery.error)}</p>
          ) : null}
          {logoutMutation.error ? (
            <p className="mt-4 text-sm text-destructive">{getRequestErrorMessage(logoutMutation.error)}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
