"use client"

import { useSearchParams } from "next/navigation"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

// Separate client component so the parent page can be a Server Component wrapped in Suspense
// (useSearchParams requires Suspense boundary in Next.js App Router)
export function ResetPasswordPageClient() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  return <ResetPasswordForm token={token} />
}
