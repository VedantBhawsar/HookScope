import { redirect } from "next/navigation"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Dashboard Redirect",
  description: "Redirecting to the active project dashboard.",
  path: "/dashboard",
  noIndex: true,
})

export default function Page() {
  redirect("/projects")
}
