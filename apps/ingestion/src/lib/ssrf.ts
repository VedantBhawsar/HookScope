import { lookup } from "node:dns/promises"

const PRIVATE_IP_RE =
  /^(127\.|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc|fd|fe80)/i

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export async function assertSafeDestination(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error("Invalid destination URL")
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Disallowed destination protocol: ${parsed.protocol}`)
  }

  const { hostname } = parsed
  if (hostname === "localhost" || PRIVATE_IP_RE.test(hostname)) {
    throw new Error("Destination URL points to a private or reserved address")
  }

  // DNS rebinding protection — re-check after resolution
  try {
    const { address } = await lookup(hostname)
    if (PRIVATE_IP_RE.test(address) || address === "0.0.0.0") {
      throw new Error("Destination URL resolves to a private or reserved address")
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("private")) throw err
  }
}
