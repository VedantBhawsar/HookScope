import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"
import { fakeUser, fakeAuthResponse } from "./helpers/fixtures"

const app = createApp()

const resetAuthMocks = () => Object.values(mocks.auth).forEach((m) => m.mockReset())
const resetOAuthMocks = () => Object.values(mocks.oauth).forEach((m) => m.mockReset())

// ─── Register ────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(resetAuthMocks)

  it("creates account with valid data → 201 + user", async () => {
    mocks.auth.register.mockResolvedValue(fakeAuthResponse)
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "test@example.com", password: "password123" })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe("test@example.com")
    expect(res.headers["set-cookie"]).toBeDefined()
  })

  it("rejects missing name → 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it("rejects missing email → 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", password: "password123" })
    expect(res.status).toBe(400)
  })

  it("rejects missing password → 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@example.com" })
    expect(res.status).toBe(400)
  })

  it("rejects password shorter than 8 chars → 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@example.com", password: "short" })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/8 characters/)
  })

  it("rejects duplicate email (EMAIL_TAKEN) → 409", async () => {
    mocks.auth.register.mockRejectedValue(new Error("EMAIL_TAKEN"))
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@example.com", password: "password123" })
    expect(res.status).toBe(409)
  })
})

// ─── Login ───────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(resetAuthMocks)

  it("logs in with valid credentials → 200 + cookies", async () => {
    mocks.auth.login.mockResolvedValue(fakeAuthResponse)
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.headers["set-cookie"]).toBeDefined()
  })

  it("rejects missing email → 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "password123" })
    expect(res.status).toBe(400)
  })

  it("rejects missing password → 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "test@example.com" })
    expect(res.status).toBe(400)
  })

  it("rejects wrong credentials (INVALID_CREDENTIALS) → 401", async () => {
    mocks.auth.login.mockRejectedValue(new Error("INVALID_CREDENTIALS"))
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrongpass" })
    expect(res.status).toBe(401)
  })
})

// ─── Refresh ─────────────────────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  beforeEach(resetAuthMocks)

  it("issues new tokens with valid refresh cookie → 200", async () => {
    mocks.auth.refresh.mockResolvedValue(fakeAuthResponse)
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "rt=valid-refresh-token")
    expect(res.status).toBe(200)
    expect(res.headers["set-cookie"]).toBeDefined()
  })

  it("rejects request without refresh cookie → 401", async () => {
    const res = await request(app).post("/api/auth/refresh")
    expect(res.status).toBe(401)
  })

  it("rejects revoked / null refresh token → 401", async () => {
    mocks.auth.refresh.mockResolvedValue(null)
    const res = await request(app).post("/api/auth/refresh").set("Cookie", "rt=revoked-token")
    expect(res.status).toBe(401)
  })
})

// ─── Logout ──────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  beforeEach(resetAuthMocks)

  it("clears cookies when called with refresh cookie → 200", async () => {
    mocks.auth.logout.mockResolvedValue(undefined)
    const res = await request(app).post("/api/auth/logout").set("Cookie", "rt=some-token")
    expect(res.status).toBe(200)
    expect(res.headers["set-cookie"]).toBeDefined()
  })

  it("succeeds gracefully without cookie (already logged out) → 200", async () => {
    const res = await request(app).post("/api/auth/logout")
    expect(res.status).toBe(200)
  })
})

// ─── Logout All ──────────────────────────────────────────────────────────────

describe("POST /api/auth/logout-all", () => {
  beforeEach(resetAuthMocks)

  it("revokes all sessions for authenticated user → 200", async () => {
    mocks.auth.logoutAllDevices.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/auth/logout-all")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/auth/logout-all")
    expect(res.status).toBe(401)
  })

  it("rejects invalid JWT cookie → 401", async () => {
    const res = await request(app)
      .post("/api/auth/logout-all")
      .set("Cookie", "at=not.a.jwt")
    expect(res.status).toBe(401)
  })
})

// ─── Forgot Password ─────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  beforeEach(resetAuthMocks)

  it("responds 200 for registered email — no info leak", async () => {
    mocks.auth.forgotPassword.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test@example.com" })
    expect(res.status).toBe(200)
  })

  it("responds 200 for unregistered email — prevent user enumeration", async () => {
    mocks.auth.forgotPassword.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@nowhere.com" })
    expect(res.status).toBe(200)
  })

  it("rejects missing email → 400", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({})
    expect(res.status).toBe(400)
  })
})

// ─── Reset Password ───────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  beforeEach(resetAuthMocks)

  it("resets password with valid token → 200", async () => {
    mocks.auth.resetPassword.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "valid-reset-token", password: "newpassword123" })
    expect(res.status).toBe(200)
  })

  it("rejects missing token → 400", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ password: "newpassword123" })
    expect(res.status).toBe(400)
  })

  it("rejects missing password → 400", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "valid-reset-token" })
    expect(res.status).toBe(400)
  })

  it("rejects password shorter than 8 chars → 400", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "tok", password: "short" })
    expect(res.status).toBe(400)
  })

  it("rejects invalid reset token (INVALID_RESET_TOKEN) → 400", async () => {
    mocks.auth.resetPassword.mockRejectedValue(new Error("INVALID_RESET_TOKEN"))
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "bad-token", password: "newpassword123" })
    expect(res.status).toBe(400)
  })

  it("rejects already-used token (TOKEN_ALREADY_USED) → 400", async () => {
    mocks.auth.resetPassword.mockRejectedValue(new Error("TOKEN_ALREADY_USED"))
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "used-token", password: "newpassword123" })
    expect(res.status).toBe(400)
  })

  it("rejects expired token (RESET_TOKEN_EXPIRED) → 400", async () => {
    mocks.auth.resetPassword.mockRejectedValue(new Error("RESET_TOKEN_EXPIRED"))
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "expired-token", password: "newpassword123" })
    expect(res.status).toBe(400)
  })
})

// ─── Onboarding ──────────────────────────────────────────────────────────────

describe("PATCH /api/auth/onboarding", () => {
  beforeEach(resetAuthMocks)

  it("saves onboarding details → 200", async () => {
    mocks.auth.completeOnboarding.mockResolvedValue(fakeUser)
    const res = await request(app)
      .patch("/api/auth/onboarding")
      .set("Cookie", await authCookie())
      .send({ companyName: "Acme Corp" })
    expect(res.status).toBe(200)
  })

  it("rejects whitespace-only companyName → 400", async () => {
    const res = await request(app)
      .patch("/api/auth/onboarding")
      .set("Cookie", await authCookie())
      .send({ companyName: "   " })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .patch("/api/auth/onboarding")
      .send({ companyName: "Acme" })
    expect(res.status).toBe(401)
  })
})

// ─── Profile ─────────────────────────────────────────────────────────────────

describe("PATCH /api/auth/profile", () => {
  beforeEach(resetAuthMocks)

  it("updates profile → 200", async () => {
    mocks.auth.updateProfile.mockResolvedValue(fakeUser)
    const res = await request(app)
      .patch("/api/auth/profile")
      .set("Cookie", await authCookie())
      .send({ name: "New Name" })
    expect(res.status).toBe(200)
  })

  it("rejects empty string for name → 400", async () => {
    const res = await request(app)
      .patch("/api/auth/profile")
      .set("Cookie", await authCookie())
      .send({ name: "" })
    expect(res.status).toBe(400)
  })

  it("allows partial update without name → 200", async () => {
    mocks.auth.updateProfile.mockResolvedValue(fakeUser)
    const res = await request(app)
      .patch("/api/auth/profile")
      .set("Cookie", await authCookie())
      .send({ companyName: "New Corp" })
    expect(res.status).toBe(200)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).patch("/api/auth/profile").send({ name: "X" })
    expect(res.status).toBe(401)
  })
})

// ─── Me ──────────────────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  beforeEach(resetAuthMocks)

  it("returns session user → 200", async () => {
    mocks.auth.getSessionUser.mockResolvedValue({ user: fakeUser, subscription: null })
    const res = await request(app).get("/api/auth/me").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe("user-001")
  })

  it("returns 401 when user not found in DB", async () => {
    mocks.auth.getSessionUser.mockResolvedValue(null)
    const res = await request(app).get("/api/auth/me").set("Cookie", await authCookie())
    expect(res.status).toBe(401)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/auth/me")
    expect(res.status).toBe(401)
  })
})

// ─── Email OTP ───────────────────────────────────────────────────────────────

describe("POST /api/auth/verify-email/send", () => {
  beforeEach(resetAuthMocks)

  it("sends OTP → 200", async () => {
    mocks.auth.sendVerificationOtp.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/auth/verify-email/send")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("responds 200 when email is already verified (idempotent)", async () => {
    mocks.auth.sendVerificationOtp.mockRejectedValue(new Error("EMAIL_ALREADY_VERIFIED"))
    const res = await request(app)
      .post("/api/auth/verify-email/send")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/already verified/i)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/auth/verify-email/send")
    expect(res.status).toBe(401)
  })
})

describe("POST /api/auth/verify-email/confirm", () => {
  beforeEach(resetAuthMocks)

  it("confirms correct OTP → 200", async () => {
    mocks.auth.verifyEmailOtp.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .set("Cookie", await authCookie())
      .send({ otp: "123456" })
    expect(res.status).toBe(200)
  })

  it("rejects missing OTP → 400", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .set("Cookie", await authCookie())
      .send({})
    expect(res.status).toBe(400)
  })

  it("rejects whitespace-only OTP → 400", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .set("Cookie", await authCookie())
      .send({ otp: "   " })
    expect(res.status).toBe(400)
  })

  it("rejects OTP_NOT_FOUND → 400", async () => {
    mocks.auth.verifyEmailOtp.mockRejectedValue(new Error("OTP_NOT_FOUND"))
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .set("Cookie", await authCookie())
      .send({ otp: "000000" })
    expect(res.status).toBe(400)
  })

  it("rejects OTP_EXPIRED → 400", async () => {
    mocks.auth.verifyEmailOtp.mockRejectedValue(new Error("OTP_EXPIRED"))
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .set("Cookie", await authCookie())
      .send({ otp: "000000" })
    expect(res.status).toBe(400)
  })

  it("rejects OTP_INVALID → 400", async () => {
    mocks.auth.verifyEmailOtp.mockRejectedValue(new Error("OTP_INVALID"))
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .set("Cookie", await authCookie())
      .send({ otp: "999999" })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email/confirm")
      .send({ otp: "123456" })
    expect(res.status).toBe(401)
  })
})

// ─── OAuth sign-in initiation ─────────────────────────────────────────────────

describe("GET /api/auth/oauth/google", () => {
  beforeEach(() => { resetAuthMocks(); resetOAuthMocks() })

  it("redirects to Google auth URL → 302", async () => {
    mocks.oauth.getGoogleAuthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=1")
    const res = await request(app).get("/api/auth/oauth/google")
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("accounts.google.com")
  })
})

describe("GET /api/auth/oauth/google/callback", () => {
  beforeEach(() => { resetAuthMocks(); resetOAuthMocks() })

  it("redirects with oauth_denied when error param is present", async () => {
    const res = await request(app)
      .get("/api/auth/oauth/google/callback")
      .query({ error: "access_denied" })
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("oauth_denied")
  })

  it("redirects with oauth_failed when code is missing", async () => {
    const res = await request(app)
      .get("/api/auth/oauth/google/callback")
      .query({ state: "some-state" })
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("oauth_failed")
  })

  it("redirects with oauth_state_mismatch when state cookie is absent", async () => {
    const res = await request(app)
      .get("/api/auth/oauth/google/callback")
      .query({ code: "code123", state: "wrong-state" })
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("oauth_state_mismatch")
  })
})

describe("GET /api/auth/oauth/github", () => {
  beforeEach(() => { resetAuthMocks(); resetOAuthMocks() })

  it("redirects to GitHub auth URL → 302", async () => {
    mocks.oauth.getGitHubAuthUrl.mockReturnValue("https://github.com/login/oauth/authorize?mock=1")
    const res = await request(app).get("/api/auth/oauth/github")
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("github.com")
  })
})

describe("GET /api/auth/oauth/github/callback", () => {
  beforeEach(() => { resetAuthMocks(); resetOAuthMocks() })

  it("redirects with oauth_denied on error param", async () => {
    const res = await request(app)
      .get("/api/auth/oauth/github/callback")
      .query({ error: "access_denied" })
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("oauth_denied")
  })

  it("redirects with oauth_failed on missing code", async () => {
    const res = await request(app)
      .get("/api/auth/oauth/github/callback")
      .query({ state: "s" })
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("oauth_failed")
  })
})

// ─── OAuth account linking ────────────────────────────────────────────────────

describe("GET /api/auth/oauth/accounts", () => {
  beforeEach(resetAuthMocks)

  it("returns linked accounts → 200", async () => {
    mocks.auth.getLinkedAccounts.mockResolvedValue([{ provider: "GOOGLE", linkedAt: "2026-01-01" }])
    const res = await request(app)
      .get("/api/auth/oauth/accounts")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.accounts)).toBe(true)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/auth/oauth/accounts")
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/auth/oauth/:provider", () => {
  beforeEach(resetAuthMocks)

  it("unlinks a social account → 200", async () => {
    mocks.auth.unlinkSocialAccount.mockResolvedValue(undefined)
    const res = await request(app)
      .delete("/api/auth/oauth/google")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects unlinking last auth method (CANNOT_UNLINK_LAST_AUTH) → 400", async () => {
    mocks.auth.unlinkSocialAccount.mockRejectedValue(new Error("CANNOT_UNLINK_LAST_AUTH"))
    const res = await request(app)
      .delete("/api/auth/oauth/google")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).delete("/api/auth/oauth/google")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/auth/oauth/google/link/callback", () => {
  beforeEach(() => { resetAuthMocks(); resetOAuthMocks() })

  it("redirects with link_error when code/state are missing", async () => {
    const res = await request(app).get("/api/auth/oauth/google/link/callback").query({})
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("link_error")
  })

  it("redirects with link_error when link state cookie is absent", async () => {
    const res = await request(app)
      .get("/api/auth/oauth/google/link/callback")
      .query({ code: "code123", state: "state123" })
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("link_error")
  })
})

describe("GET /api/auth/oauth/github/link/callback", () => {
  beforeEach(() => { resetAuthMocks(); resetOAuthMocks() })

  it("redirects with link_error when code is missing", async () => {
    const res = await request(app).get("/api/auth/oauth/github/link/callback").query({})
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain("link_error")
  })
})
