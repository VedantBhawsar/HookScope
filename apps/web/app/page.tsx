import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Page() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  redirect(hasSessionCookie ? "/dashboard" : "/auth/login")
}
