import { Suspense } from "react"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordPageClient } from "./page-client"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Reset Password",
  description: "Choose a new password to restore access to your HookScope workspace.",
  path: "/auth/reset-password",
  noIndex: true,
})

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      <Suspense>
        <ResetPasswordPageClient />
      </Suspense>
    </AuthShell>
  )
}
