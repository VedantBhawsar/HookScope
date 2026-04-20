import type { CookieOptions, Response } from "express"

export const REFRESH_TOKEN_COOKIE = "rt"
export const ACCESS_TOKEN_COOKIE = "at"

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000 // 15 minutes

const isProduction = process.env["NODE_ENV"] === "production"

/**
 * Base cookie config — httpOnly, SameSite=Lax, Secure in production.
 * Set COOKIE_DOMAIN=".yourdomain.com" in production for subdomain sharing.
 */
function baseCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
    domain: process.env["COOKIE_DOMAIN"], // undefined in dev → no domain restriction
  }
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, baseCookieOptions(ACCESS_TOKEN_MAX_AGE_MS))
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, baseCookieOptions(REFRESH_TOKEN_MAX_AGE_MS))
}

export function clearAuthCookies(res: Response): void {
  const clearOpts: CookieOptions = { httpOnly: true, path: "/", domain: process.env["COOKIE_DOMAIN"] }
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearOpts)
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearOpts)
}