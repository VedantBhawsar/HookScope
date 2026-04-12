// Custom OAuth 2.0 helpers — no Passport.js dependency.
// Each provider needs only: code exchange → access token → user profile.

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
const GITHUB_USERINFO_URL = "https://api.github.com/user"
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

export interface OAuthUserProfile {
  providerAccountId: string
  email: string
  name: string
  avatarUrl?: string
}

interface GoogleTokenResponse {
  access_token: string
  token_type: string
}

interface GoogleUserInfo {
  sub: string
  email: string
  name: string
  picture?: string
}

interface GitHubTokenResponse {
  access_token: string
  token_type: string
}

interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
    redirect_uri: googleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env["GITHUB_CLIENT_ID"] ?? "",
    redirect_uri: githubCallbackUrl(),
    scope: "read:user user:email",
    state,
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export async function exchangeGoogleCode(code: string): Promise<OAuthUserProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
      client_secret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
      redirect_uri: googleCallbackUrl(),
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error("[oauth:google] Token exchange failed:", body)
    throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED")
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!userRes.ok) throw new Error("GOOGLE_USERINFO_FAILED")

  const profile = (await userRes.json()) as GoogleUserInfo
  return {
    providerAccountId: profile.sub,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
  }
}

export async function exchangeGitHubCode(code: string): Promise<OAuthUserProfile> {
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env["GITHUB_CLIENT_ID"] ?? "",
      client_secret: process.env["GITHUB_CLIENT_SECRET"] ?? "",
    }),
  })

  if (!tokenRes.ok) throw new Error("GITHUB_TOKEN_EXCHANGE_FAILED")
  const tokens = (await tokenRes.json()) as GitHubTokenResponse

  const authHeader = { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/vnd.github+json" }

  const [userRes, emailsRes] = await Promise.all([
    fetch(GITHUB_USERINFO_URL, { headers: authHeader }),
    fetch(GITHUB_EMAILS_URL, { headers: authHeader }),
  ])

  if (!userRes.ok) throw new Error("GITHUB_USERINFO_FAILED")
  const user = (await userRes.json()) as GitHubUser

  // GitHub can hide the primary email on profile; fetch from the emails API instead
  const emails = emailsRes.ok ? ((await emailsRes.json()) as GitHubEmail[]) : []
  const primaryEmail =
    emails.find((e) => e.primary && e.verified)?.email ?? user.email

  if (!primaryEmail) throw new Error("GITHUB_NO_EMAIL")

  return {
    providerAccountId: String(user.id),
    email: primaryEmail,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url,
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function apiBaseUrl(): string {
  return (process.env["API_BASE_URL"] ?? "http://localhost:5000").replace(/\/$/, "")
}

function googleCallbackUrl(): string {
  return `${apiBaseUrl()}/api/auth/oauth/google/callback`
}

function githubCallbackUrl(): string {
  return `${apiBaseUrl()}/api/auth/oauth/github/callback`
}
