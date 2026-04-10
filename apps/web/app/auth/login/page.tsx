import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const hasAccessCookie = Boolean(cookieStore.get("at")?.value)

  if (hasAccessCookie) {
    redirect("/projects")
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
