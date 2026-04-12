import { Suspense } from "react"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordPageClient } from "./page-client"

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      <Suspense>
        <ResetPasswordPageClient />
      </Suspense>
    </AuthShell>
  )
}
