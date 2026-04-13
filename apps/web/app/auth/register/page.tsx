import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { RegisterForm } from "@/components/auth/register-form"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Register",
  description: "Create a workspace to receive, inspect, and replay webhook events.",
  path: "/auth/register",
  noIndex: true,
})

export default async function RegisterPage() {
  const cookieStore = await cookies()
  const hasAccessCookie = Boolean(cookieStore.get("at")?.value)

  if (hasAccessCookie) {
    redirect("/projects")
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
