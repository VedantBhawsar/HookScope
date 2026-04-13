import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ProjectsWorkspace } from "@/components/projects/projects-workspace"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Projects",
  description: "Choose a project, create new workspaces, and enter your webhook dashboards.",
  path: "/projects",
  noIndex: true,
})

export default async function ProjectsPage() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (!hasSessionCookie) {
    redirect("/auth/login")
  }

  return <ProjectsWorkspace />
}
