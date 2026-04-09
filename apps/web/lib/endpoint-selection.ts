export interface EndpointSelectionSnapshot {
  id: string
  name: string
}

const ACTIVE_ENDPOINT_KEY_PREFIX = "active_endpoint"

function getStorageKey(projectId: string): string {
  return `${ACTIVE_ENDPOINT_KEY_PREFIX}:${projectId}`
}

export function getActiveEndpointForProject(projectId: string): EndpointSelectionSnapshot | null {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId))
    if (!raw) return null
    return JSON.parse(raw) as EndpointSelectionSnapshot
  } catch {
    return null
  }
}

export function setActiveEndpointForProject(
  projectId: string,
  endpoint: EndpointSelectionSnapshot
): void {
  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(endpoint))
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

export function clearActiveEndpointForProject(projectId: string): void {
  try {
    localStorage.removeItem(getStorageKey(projectId))
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}
