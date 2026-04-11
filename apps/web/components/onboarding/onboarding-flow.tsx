"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import { useCompleteOnboardingMutation, useMeQuery } from "@/hooks/use-auth"
import { useCreateProjectMutation } from "@/hooks/use-projects"

const ONBOARDING_STEPS = ["verify", "company", "project"] as const
type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

function isOnboardingStep(value: string | null): value is OnboardingStep {
  return value === "verify" || value === "company" || value === "project"
}

export function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const meQuery = useMeQuery()
  const onboardingMutation = useCompleteOnboardingMutation()
  const projectMutation = useCreateProjectMutation()

  const [companyName, setCompanyName] = React.useState("")
  const [companyRole, setCompanyRole] = React.useState("")
  const [companySize, setCompanySize] = React.useState("")
  const [useCase, setUseCase] = React.useState("")
  const [projectName, setProjectName] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")

  const user = meQuery.data?.user
  const stepParam = searchParams.get("step")
  const currentStep: OnboardingStep = isOnboardingStep(stepParam) ? stepParam : "verify"

  React.useEffect(() => {
    if (!user) return

    if (user.onboarding.onboardingCompleted) {
      router.replace("/projects")
      router.refresh()
      return
    }

    const hasCompanyDetails = Boolean(user.onboarding.companyName)
    const hasCreatedProject = user.onboarding.hasCreatedProject

    if (currentStep === "verify") {
      return
    }

    if (currentStep === "company") {
      if (hasCompanyDetails) {
        router.replace("/onboarding?step=project")
      }
      return
    }

    if (!hasCompanyDetails) {
      router.replace("/onboarding?step=company")
      return
    }

    if (hasCreatedProject) {
      router.replace("/projects")
    }
  }, [currentStep, router, user])

  React.useEffect(() => {
    if (!user) return

    if (user.onboarding.companyName) {
      setCompanyName(user.onboarding.companyName)
      setCompanyRole(user.onboarding.companyRole ?? "")
      setCompanySize(user.onboarding.companySize ?? "")
      setUseCase(user.onboarding.useCase ?? "")
    }
  }, [user])

  const onSaveCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await onboardingMutation.mutateAsync({
        companyName,
        companyRole,
        companySize,
        useCase,
      })
      toast.success("Company details saved")
      router.replace("/onboarding?step=project")
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  const onCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await projectMutation.mutateAsync({
        name: projectName,
        description: projectDescription || undefined,
      })
      toast.success("Project created")
      router.replace("/projects")
      router.refresh()
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  if (meQuery.isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading onboarding...
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please sign in to continue onboarding.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const hasCompanyDetails = Boolean(user.onboarding.companyName)
  const hasCreatedProject = user.onboarding.hasCreatedProject

  const stepIndex = ONBOARDING_STEPS.indexOf(currentStep)
  const stepLabel = `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`

  const goToStep = (step: OnboardingStep) => {
    router.replace(`/onboarding?step=${step}`)
  }

  return (
    <section className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Onboarding</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Let&apos;s set up your workspace</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{stepLabel}</p>
          <p className="mt-2 text-muted-foreground">
            We&apos;ll verify your account details and help you create your first project.
          </p>
        </header>

        {currentStep === "verify" ? (
          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold">Step 1. Verify your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Email verification status: {user.onboarding.emailVerified ? "Verified" : "Pending"}.
            </p>
            {!user.onboarding.emailVerified ? (
              <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                Verification is currently pending. Continue setup now and verify your inbox to unlock all production features.
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button onClick={() => goToStep("company")}>Continue</Button>
            </div>
          </article>
        ) : null}

        {currentStep === "company" ? (
          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold">Step 2. Company details</h2>
            {!hasCompanyDetails ? (
              <form className="mt-4 space-y-4" onSubmit={onSaveCompany}>
                <Field
                  id="company-name"
                  label="Company name"
                  value={companyName}
                  placeholder="Acme Inc"
                  onChange={setCompanyName}
                  required
                />
                <Field
                  id="company-role"
                  label="Your role"
                  value={companyRole}
                  placeholder="Founder, Engineering Manager, Developer"
                  onChange={setCompanyRole}
                />
                <Field
                  id="company-size"
                  label="Team size"
                  value={companySize}
                  placeholder="1-10, 11-50, 51-200"
                  onChange={setCompanySize}
                />
                <Field
                  id="use-case"
                  label="Primary use case"
                  value={useCase}
                  placeholder="Observe Stripe and GitHub webhooks"
                  onChange={setUseCase}
                />
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => goToStep("verify")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={onboardingMutation.isPending}>
                    {onboardingMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {onboardingMutation.isPending ? "Saving..." : "Save and continue"}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700">
                  Company details saved for {user.onboarding.companyName}.
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => goToStep("verify")}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => goToStep("project")}>
                    Continue
                  </Button>
                </div>
              </>
            )}
          </article>
        ) : null}

        {currentStep === "project" ? (
          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold">Step 3. Create your first project</h2>
            {!hasCreatedProject ? (
              <form className="mt-4 space-y-4" onSubmit={onCreateProject}>
                <Field
                  id="project-name"
                  label="Project name"
                  value={projectName}
                  placeholder="Payments Webhooks"
                  onChange={setProjectName}
                  required
                />
                <Field
                  id="project-description"
                  label="Description"
                  value={projectDescription}
                  placeholder="Capture and inspect Stripe events"
                  onChange={setProjectDescription}
                />
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => goToStep("company")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={projectMutation.isPending || !hasCompanyDetails}>
                    {projectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {projectMutation.isPending ? "Creating project..." : "Create project"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700">
                Your first project is ready. Redirecting you to dashboard.
              </div>
            )}
          </article>
        ) : null}
      </div>
    </section>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  required?: boolean
}

function Field({ id, label, value, placeholder, onChange, required = false }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
      />
    </div>
  )
}
