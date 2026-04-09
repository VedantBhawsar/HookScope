import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (hasSessionCookie) {
    redirect("/dashboard")
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your observability workspace and continue tracking webhook traffic."

    >
      <LoginForm />
    </AuthShell>
  )
}
