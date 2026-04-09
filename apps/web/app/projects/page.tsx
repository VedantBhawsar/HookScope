import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ProjectsWorkspace } from "@/components/projects/projects-workspace"

export default async function ProjectsPage() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (!hasSessionCookie) {
    redirect("/auth/login")
  }

  return <ProjectsWorkspace />
}
