import { getActiveEndpointForProject } from "@/lib/endpoint-selection"

const LAST_OPENED_KEY = "last_opened_project"

export function getLastOpenedProject(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(LAST_OPENED_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { id: string; name: string }
  } catch {
    return null
  }
}

export function setLastOpenedProject(project: { id: string; name: string }) {
  try {
    localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(project))
  } catch {
    //
  }
}

export function getProjectDashboardHref(projectId: string): string {
  const storedEndpoint = getActiveEndpointForProject(projectId)
  if (!storedEndpoint?.id) {
    return `/dashboard/${encodeURIComponent(projectId)}`
  }
  return `/dashboard/${encodeURIComponent(projectId)}/${encodeURIComponent(storedEndpoint.id)}`
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
