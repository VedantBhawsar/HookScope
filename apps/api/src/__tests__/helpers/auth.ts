import { SignJWT } from "jose"
import { ACCESS_TOKEN_COOKIE } from "../../lib/cookies"

const TEST_SECRET = "test-secret-key-for-unit-tests-only-32c"

// Override the JWT secret at the process level for tests
process.env["JWT_ACCESS_SECRET"] = TEST_SECRET

export const TEST_USER_ID = "user-test-id-001"
export const TEST_USER_EMAIL = "test@example.com"

export async function signTestToken(userId = TEST_USER_ID, email = TEST_USER_EMAIL): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET)
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret)
}

/**
 * Returns the Cookie header string with a valid access token.
 * Use with supertest: .set("Cookie", await authCookie())
 */
export async function authCookie(userId?: string, email?: string): Promise<string> {
  const token = await signTestToken(userId, email)
  return `${ACCESS_TOKEN_COOKIE}=${token}`
}
