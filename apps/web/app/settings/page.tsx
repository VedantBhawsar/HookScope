import { SettingsWorkspace } from "@/components/settings/settings-workspace"
import { createPageMetadata } from "@/app/metadata"

export const metadata = createPageMetadata({
  title: "Settings",
  description: "Manage workspace profile details, preferences, and account configuration.",
  path: "/settings",
  noIndex: true,
})

export default function SettingsPage() {
  return <SettingsWorkspace />
}
