"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Building2,
  Check,
  FolderPlus,
  MailCheck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion"
import { cn } from "@hookscope/ui/lib/utils"
import { Button } from "@hookscope/ui/components/button"
import { Skeleton } from "@hookscope/ui/components/skeleton"
import { getRequestErrorMessage } from "@/lib/http"
import { useMeQuery, useCompleteOnboardingMutation } from "@/hooks/use-auth"
import { useCreateProjectMutation } from "@/hooks/use-projects"
import { useCheckoutMutation } from "@/hooks/use-billing"
import { CompanyStepForm, type CompanyFormValues } from "./company-step-form"
import { ProjectStepForm, type ProjectFormValues } from "./project-step-form"
import { VerifyStep } from "./verify-step"
import { PlanStep } from "./plan-step"
import type { BillingInterval } from "@/components/pricing/pricing-data"

// ─── Motion presets ───────────────────────────────────────────────────────────

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EASE_IN: [number, number, number, number] = [0.55, 0.06, 0.68, 0.19]
const spring = { type: "spring", stiffness: 400, damping: 30 } as const

const stepSlideVariants: Variants = {
  enter: (dir: number) => ({ x: dir * 36, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  exit: (dir: number) => ({
    x: dir * -36,
    opacity: 0,
    transition: { duration: 0.16, ease: EASE_IN },
  }),
}

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
  onSelect,
}: {
  step: (typeof STEPS)[number]
  status: "completed" | "active" | "pending"
  onSelect?: () => void
}) {
  const Icon = step.icon
  const clickable = status !== "pending"
  return (
    <button
      type="button"
      onClick={clickable ? onSelect : undefined}
      disabled={!clickable}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-1.5 text-left text-sm transition-colors outline-none",
        clickable && "cursor-pointer hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50",
        status === "active"
          ? "text-foreground"
          : status === "completed"
            ? "text-foreground/70"
            : "text-muted-foreground/50"
      )}
    >
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          status === "completed"
            ? "border-primary bg-primary text-primary-foreground"
            : status === "active"
              ? "border-primary bg-background text-primary"
              : "border-border bg-muted/30 text-muted-foreground"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === "completed" ? (
            <motion.span
              key="check"
              initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={spring}
            >
              <Check className="size-4" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Icon className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
        {status === "active" && (
          <motion.span
            layoutId="onboarding-active-step"
            className="absolute -inset-1.5 rounded-full ring-2 ring-primary/50"
            transition={spring}
          />
        )}
      </span>
      <span>
        <p className="font-medium leading-snug">{step.label}</p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
      </span>
    </button>
  )
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[340px_1fr]">
      <aside className="hidden flex-col border-r bg-muted/20 px-8 py-10 lg:flex">
        <Skeleton className="h-10 w-40" />
        <div className="mt-12 flex-1 space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md space-y-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-6 h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </main>
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
  const reduceMotion = useReducedMotion()

  const [loadingPlanId, setLoadingPlanId] = React.useState<string | null>(null)

  const user = meQuery.data?.user
  const stepParam = searchParams.get("step")
  const currentStep: OnboardingStep = isValidStep(stepParam) ? stepParam : "verify"
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  // Slide direction for step transitions
  const prevIndexRef = React.useRef(currentIndex)
  const [direction, setDirection] = React.useState(0)
  React.useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      setDirection(currentIndex > prevIndexRef.current ? 1 : -1)
      prevIndexRef.current = currentIndex
    }
  }, [currentIndex])

  // ─── Guards ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!user) return

    if (user.onboarding.onboardingCompleted) {
      router.replace("/projects")
      return
    }

    // "verify" and "company" are always reachable so users can edit / revisit them.
    if (currentStep === "verify" || currentStep === "company") return

    // "project" and "plan" require a company to exist first.
    if (!user.onboarding.companyName) {
      router.replace("/onboarding?step=company")
    }
  }, [currentStep, router, user])

  const goTo = (step: OnboardingStep) =>
    router.push(`/onboarding?step=${step}`)

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
    return <OnboardingSkeleton />
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
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

  const headerDelay = reduceMotion ? 0 : 0.08
  const bodyDelay = reduceMotion ? 0 : 0.18

  const stepVariants = reduceMotion
    ? {
        enter: { x: 0, opacity: 0 },
        center: { x: 0, opacity: 1, transition: { duration: 0 } },
        exit: { x: 0, opacity: 0, transition: { duration: 0 } },
      }
    : stepSlideVariants

  // ─── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[340px_1fr]">
      {/* ── Left sidebar ────────────────────────────────────────────────────── */}
      <aside className="hidden flex-col border-r bg-muted/20 px-8 py-10 lg:flex">
        <Link href="/" className="mb-12 block w-fit" aria-label="HookScope home">
          <div className="relative h-10 w-40 overflow-hidden">
            <Image
              src="/logo-light.png"
              alt="HookScope"
              fill
              priority
              className="object-contain object-center dark:hidden"
            />
            <Image
              src="/logo-dark.png"
              alt="HookScope"
              fill
              priority
              className="object-contain object-center hidden dark:block"
            />
          </div>
        </Link>

        {/* Step list */}
        <nav className="flex-1 space-y-0.5" aria-label="Onboarding progress">
          {STEPS.map((step, i) => {
            const status =
              i < currentIndex
                ? "completed"
                : i === currentIndex
                  ? "active"
                  : "pending"
            return (
              <React.Fragment key={step.id}>
                <StepItem
                  step={step}
                  status={status}
                  onSelect={() => goTo(step.id)}
                />
                {i < STEPS.length - 1 && (
                  <motion.div
                    className="ml-[17px] h-7 w-0.5 rounded-full"
                    initial={false}
                    animate={{
                      backgroundColor:
                        i < currentIndex
                          ? "var(--primary)"
                          : "var(--border)",
                      opacity: i < currentIndex ? 1 : 0.6,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
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
        {/* Mobile: animated progress bar */}
        <div className="mb-8 w-full max-w-lg lg:hidden">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: (currentIndex + 1) / STEPS.length }}
              style={{ originX: 0 }}
              transition={reduceMotion ? { duration: 0 } : spring}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Step {currentIndex + 1} of {STEPS.length}
          </p>
        </div>

        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className={cn("w-full", isPlanStep ? "" : "mx-auto max-w-md")}>
                {/* Step header */}
                <motion.div
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: headerDelay, duration: 0.3, ease: EASE_OUT }}
                  className="mb-8 space-y-1"
                >
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
                </motion.div>

                {/* Step content */}
                <motion.div
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: bodyDelay, duration: 0.35, ease: EASE_OUT }}
                >
                  {currentStep === "verify" && (
                    <VerifyStep
                      email={user.email}
                      emailVerified={user.onboarding.emailVerified}
                      onContinue={() => goTo("company")}
                    />
                  )}

                  {currentStep === "company" && (
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
                  )}

                  {currentStep === "project" &&
                    (hasCreatedProject ? (
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: headerDelay, duration: 0.3, ease: EASE_OUT }}
                          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4"
                        >
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: reduceMotion ? 0 : 0.1, ...spring }}
                          >
                            <Check className="mt-0.5 size-4 shrink-0 text-success" />
                          </motion.span>
                          <p className="text-sm text-success">
                            Your first project is ready. Ready for billing.
                          </p>
                        </motion.div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="min-h-11 flex-1"
                            onClick={() => goTo("company")}
                          >
                            Back
                          </Button>
                          <Button className="min-h-11 flex-1" onClick={() => goTo("plan")}>
                            Continue
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ProjectStepForm
                        disabled={!companyName}
                        isPending={projectMutation.isPending}
                        onBack={() => goTo("company")}
                        onSubmit={handleCreateProject}
                      />
                    ))}

                  {currentStep === "plan" && (
                    <PlanStep
                      onSelect={handleSelectPlan}
                      loadingPlanId={loadingPlanId}
                      isPending={checkoutMutation.isPending}
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
