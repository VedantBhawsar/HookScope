import { lookup } from "node:dns/promises"

const PRIVATE_IP_RE =
  /^(127\.|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc|fd|fe80)/i

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export function isPrivateUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl)
    if (!ALLOWED_PROTOCOLS.has(protocol)) return true
    if (hostname === "localhost") return true
    return PRIVATE_IP_RE.test(hostname)
  } catch {
    return true
  }
}

export async function resolveAndBlockSsrf(rawUrl: string): Promise<void> {
  const { protocol, hostname } = new URL(rawUrl)

  if (!ALLOWED_PROTOCOLS.has(protocol)) {
    throw new Error(`Disallowed protocol: ${protocol}`)
  }

  if (isPrivateUrl(rawUrl)) {
    throw new Error("Destination URL resolves to a private or reserved address")
  }

  // Re-check resolved IP to prevent DNS rebinding
  try {
    const { address } = await lookup(hostname)
    if (PRIVATE_IP_RE.test(address) || address === "0.0.0.0") {
      throw new Error("Destination URL resolves to a private or reserved address")
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("private")) throw err
  }
}
