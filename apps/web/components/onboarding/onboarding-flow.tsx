"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Building2,
  Check,
  FolderPlus,
  Loader2,
  MailCheck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { getRequestErrorMessage } from "@/lib/http"
import { useMeQuery, useCompleteOnboardingMutation } from "@/hooks/use-auth"
import { useCreateProjectMutation } from "@/hooks/use-projects"
import { useCheckoutMutation } from "@/hooks/use-billing"
import { CompanyStepForm, type CompanyFormValues } from "./company-step-form"
import { ProjectStepForm, type ProjectFormValues } from "./project-step-form"
import { VerifyStep } from "./verify-step"
import { PlanStep } from "./plan-step"
import type { BillingInterval } from "@/components/pricing/pricing-data"

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "verify",
    label: "Verify email",
    description: "Confirm your account",
    icon: MailCheck,
  },
  {
    id: "company",
    label: "Your team",
    description: "Tell us about yourself",
    icon: Building2,
  },
  {
    id: "project",
    label: "First project",
    description: "Set up your workspace",
    icon: FolderPlus,
  },
  {
    id: "plan",
    label: "Choose a plan",
    description: "Start your 7-day trial",
    icon: Zap,
  },
] as const

type OnboardingStep = (typeof STEPS)[number]["id"]

function isValidStep(v: string | null): v is OnboardingStep {
  return !!STEPS.find((s) => s.id === v)
}

// ─── Sidebar step indicator ───────────────────────────────────────────────────

function StepItem({
  step,
  status,
}: {
  step: (typeof STEPS)[number]
  status: "completed" | "active" | "pending"
}) {
  const Icon = step.icon
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm transition-colors",
        status === "active"
          ? "text-foreground"
          : status === "completed"
            ? "text-foreground/60"
            : "text-muted-foreground/60"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          status === "completed"
            ? "border-primary bg-primary text-primary-foreground"
            : status === "active"
              ? "border-primary bg-background text-primary shadow-sm shadow-primary/20"
              : "border-border bg-muted/30 text-muted-foreground"
        )}
      >
        {status === "completed" ? (
          <Check className="size-4" />
        ) : (
          <Icon className="size-4" />
        )}
      </div>
      <div>
        <p className={cn("font-medium leading-snug", status === "active" && "text-foreground")}>
          {step.label}
        </p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const meQuery = useMeQuery()
  const onboardingMutation = useCompleteOnboardingMutation()
  const projectMutation = useCreateProjectMutation()
  const checkoutMutation = useCheckoutMutation()

  const [loadingPlanId, setLoadingPlanId] = React.useState<string | null>(null)

  const user = meQuery.data?.user
  const stepParam = searchParams.get("step")
  const currentStep: OnboardingStep = isValidStep(stepParam) ? stepParam : "verify"
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  // ─── Guards ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!user) return

    if (user.onboarding.onboardingCompleted) {
      router.replace("/projects")
      return
    }

    const { companyName, hasCreatedProject } = user.onboarding

    if (currentStep === "verify") return

    if (currentStep === "company") {
      if (companyName) router.replace("/onboarding?step=project")
      return
    }

    if (!companyName) {
      router.replace("/onboarding?step=company")
      return
    }

    if (currentStep === "project") {
      if (hasCreatedProject) router.replace("/onboarding?step=plan")
      return
    }
    // "plan" step is always reachable after project is created
  }, [currentStep, router, user])

  const goTo = (step: OnboardingStep) =>
    router.replace(`/onboarding?step=${step}`)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveCompany = async (values: CompanyFormValues) => {
    try {
      const { message } = await onboardingMutation.mutateAsync({
        companyName: values.companyName,
        companyRole: values.companyRole,
        companySize: values.companySize,
        useCase: values.useCase,
      })
      toast.success(message)
      goTo("project")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  const handleCreateProject = async (values: ProjectFormValues) => {
    try {
      const { message } = await projectMutation.mutateAsync({
        name: values.name,
        description: values.description?.trim() || undefined,
      })
      toast.success(message)
      goTo("plan")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  const handleSelectPlan = (planId: string, interval: BillingInterval) => {
    setLoadingPlanId(planId)
    checkoutMutation.mutate(
      { planId, interval, returnTo: "projects" },
      {
        onError: () => {
          toast.error("Failed to start checkout. Please try again.")
          setLoadingPlanId(null)
        },
      }
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <p className="text-sm text-muted-foreground">Please sign in to continue.</p>
          <Button asChild className="w-full">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { companyName, hasCreatedProject } = user.onboarding
  const currentStepMeta = STEPS[currentIndex]!
  const isPlanStep = currentStep === "plan"

  // ─── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[340px_1fr]">
      {/* ── Left sidebar ────────────────────────────────────────────────────── */}
      <aside className="hidden flex-col border-r bg-muted/20 px-8 py-10 lg:flex">
        {/* Logo */}
        <div className="mb-12">
          <div className="relative h-10 w-40 overflow-hidden">
            <Image src="/logo-light.png" alt="HookScope" fill className="object-cover object-center dark:hidden" />
            <Image src="/logo-dark.png" alt="HookScope" fill className="object-cover object-center hidden dark:block" />
          </div>
        </div>

        {/* Step list */}
        <nav className="flex-1 space-y-0.5">
          {STEPS.map((step, i) => {
            const status =
              i < currentIndex
                ? "completed"
                : i === currentIndex
                  ? "active"
                  : "pending"
            return (
              <React.Fragment key={step.id}>
                <StepItem step={step} status={status} />
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "ml-[17px] h-7 w-px border-l-2 border-dashed",
                      i < currentIndex ? "border-primary/40" : "border-border/60"
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto space-y-1 pt-8">
          <p className="text-sm font-medium text-foreground/80">
            &ldquo;Ship with confidence. Sleep well.&rdquo;
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            7-day free trial · No credit card to start · Cancel anytime
          </p>
        </div>
      </aside>

      {/* ── Right content ───────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile: pill progress bar */}
        <div className="mb-8 w-full max-w-lg lg:hidden">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  i <= currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Step {currentIndex + 1} of {STEPS.length}
          </p>
        </div>

        <div className={cn("w-full", isPlanStep ? "max-w-4xl" : "max-w-md")}>
          {/* Step header */}
          <div className="mb-8 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Step {currentIndex + 1} / {STEPS.length}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {currentStep === "verify" && "Welcome aboard"}
              {currentStep === "company" && "Tell us about your team"}
              {currentStep === "project" && "Create your first project"}
              {currentStep === "plan" && "Start your free trial"}
            </h1>
            <p className="text-muted-foreground">
              {currentStepMeta.description}
            </p>
          </div>

          {/* Step content */}
          {currentStep === "verify" && (
            <VerifyStep
              emailVerified={user.onboarding.emailVerified}
              onContinue={() => goTo("company")}
            />
          )}

          {currentStep === "company" && (
            companyName ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    Company details saved for <strong>{companyName}</strong>.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => goTo("verify")}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => goTo("project")}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <CompanyStepForm
                defaultValues={{
                  companyName: companyName ?? "",
                  companyRole: user.onboarding.companyRole ?? "",
                  companySize: user.onboarding.companySize ?? "",
                  useCase: user.onboarding.useCase ?? "",
                }}
                isPending={onboardingMutation.isPending}
                onBack={() => goTo("verify")}
                onSubmit={handleSaveCompany}
              />
            )
          )}

          {currentStep === "project" && (
            hasCreatedProject ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-700">
                  Your first project is ready. Redirecting to billing…
                </p>
              </div>
            ) : (
              <ProjectStepForm
                disabled={!companyName}
                isPending={projectMutation.isPending}
                onBack={() => goTo("company")}
                onSubmit={handleCreateProject}
              />
            )
          )}

          {currentStep === "plan" && (
            <PlanStep
              onSelect={handleSelectPlan}
              loadingPlanId={loadingPlanId}
              isPending={checkoutMutation.isPending}
            />
          )}
        </div>
      </main>
    </div>
  )
}
