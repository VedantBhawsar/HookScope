import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (hasSessionCookie) {
    redirect("/dashboard")
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Set up your account and start receiving, inspecting, and replaying webhook events."
    >
      <RegisterForm />
    </AuthShell>
  )
}
