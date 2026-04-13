import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createPageMetadata } from "./metadata"

export const metadata = createPageMetadata({
  title: "Workspace Redirect",
  description: "Redirecting you into the correct webhook observability workspace.",
  path: "/",
  noIndex: true,
})

export default async function Page() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  redirect(hasSessionCookie ? "/projects" : "/auth/login")
}
