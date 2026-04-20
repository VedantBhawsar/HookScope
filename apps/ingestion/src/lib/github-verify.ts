import { createHmac } from "node:crypto"

export interface VerificationResult {
  valid: boolean
  error: string | null
}

/**
 * Verifies a GitHub webhook signature using HMAC-SHA256.
 *
 * GitHub sends the signature in the `X-Hub-Signature-256` header as `sha256=<hex>`.
 * We compute HMAC-SHA256(secret, rawBody) and compare with the provided signature.
 *
 * CRITICAL: The `rawBody` must be the raw request body (Buffer/string),
 * NOT the parsed JSON — GitHub signature verification will fail otherwise.
 */
export function verifyGitHubSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): VerificationResult {
  try {
    // Extract the hex portion from "sha256=<hex>"
    const [algo, hash] = signature.split("=")

    if (algo !== "sha256" || !hash) {
      return { valid: false, error: "Invalid signature format (expected sha256=<hex>)" }
    }

    // Compute HMAC-SHA256
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8")
    const computed = createHmac("sha256", secret).update(body).digest("hex")

    // Constant-time comparison to prevent timing attacks
    const isValid = constantTimeCompare(computed, hash)

    return {
      valid: isValid,
      error: isValid ? null : "Signature mismatch",
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown verification error"
    return { valid: false, error: message }
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if both strings are equal (same length + content).
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
