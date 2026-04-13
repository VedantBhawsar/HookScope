import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Onboarding",
  description: "Set up your workspace details and create the first project for webhook monitoring.",
  path: "/onboarding",
  noIndex: true,
})

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (!hasSessionCookie) {
    redirect("/auth/login")
  }

  return <OnboardingFlow />
}
