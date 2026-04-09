import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (!hasSessionCookie) {
    redirect("/auth/login")
  }

  return <OnboardingFlow />
}
