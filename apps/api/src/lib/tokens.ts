import { SignJWT, jwtVerify } from "jose"
import type { AccessTokenPayload } from "../types/auth"

const ACCESS_TOKEN_TTL = "15m"
export const ACCESS_TOKEN_EXPIRES_IN = 15 * 60 // seconds

function accessSecret(): Uint8Array {
  const secret = process.env["JWT_ACCESS_SECRET"]
  if (!secret) throw new Error("JWT_ACCESS_SECRET env var is not set")
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(accessSecret())
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret())
    const { userId, email } = payload as Record<string, unknown>
    if (typeof userId !== "string" || typeof email !== "string") return null
    return { userId, email }
  } catch {
    return null
  }
}

/** Generate a cryptographically-random opaque refresh token (64-char hex). */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** SHA-256 hex digest — store/look up tokens without persisting the raw value. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const buffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
