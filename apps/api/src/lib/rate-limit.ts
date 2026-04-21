import { rateLimit } from "express-rate-limit"

/**
 * Rate limiter for the forgot-password endpoint.
 *
 * Strategy: 5 requests per 15-minute window per IP (default in-memory store).
 * This prevents email flooding while allowing legitimate "I forgot my password" retries.
 * For production, swap the default MemoryStore for a Redis store to share limits across
 * multiple API instances and survive restarts.
 */
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests. Please wait 15 minutes and try again.",
    data: null,
  },
  // Skip counting successful responses — only penalise actual attempts.
  skipSuccessfulRequests: false,
})

/**
 * Rate limiter for OTP send endpoint.
 * 3 sends per 10-minute window per IP — prevents OTP flooding while allowing retries.
 */
export const otpSendRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification code requests. Please wait 10 minutes and try again.",
    data: null,
  },
})

/**
 * Tighter rate limit for OAuth callback endpoints.
 * Prevents code-stuffing attacks (replaying intercepted auth codes).
 */
export const oauthCallbackRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OAuth requests. Please try again shortly.",
    data: null,
  },
})
