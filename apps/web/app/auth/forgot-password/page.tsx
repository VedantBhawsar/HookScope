import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Forgot Password",
  description: "Request a password reset link for your webhook observability workspace.",
  path: "/auth/forgot-password",
  noIndex: true,
})

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
