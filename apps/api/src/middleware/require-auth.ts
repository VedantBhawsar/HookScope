import type { NextFunction, Request, Response } from "express"
import { ACCESS_TOKEN_COOKIE } from "../lib/cookies"
import { verifyAccessToken } from "../lib/tokens"
import type { AccessTokenPayload } from "../types/auth"
import { unauthorized } from "../lib/response"

export type AuthenticatedRequest = Request & { user: AccessTokenPayload }

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined
  if (!token) {
    unauthorized(res, "Authentication required")
    return
  }

  const payload = await verifyAccessToken(token)
  if (!payload) {
    unauthorized(res, "Invalid or expired session")
    return
  }

  (req as AuthenticatedRequest).user = payload
  next()
}
