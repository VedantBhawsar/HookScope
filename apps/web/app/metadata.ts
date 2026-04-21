import type { Metadata } from "next"
import { cookies } from "next/headers"

export const APP_NAME = "HookScope"

export const APP_DESCRIPTION =
  "Monitor webhook traffic, inspect deliveries, and manage endpoint alerts from one observability workspace."

const DEFAULT_SITE_URL = "http://localhost:3000"
const DEFAULT_API_URL = "http://localhost:5000"

interface CreatePageMetadataOptions {
  title: string
  absoluteTitle?: string
  description?: string
  path?: string
  noIndex?: boolean
}

interface AuthMeMetadataResponse {
  success?: boolean
  data?: {
    user?: {
      onboarding?: {
        companyName?: string | null
      } | null
    } | null
  } | null
}

export function getMetadataBase() {
  const vercelUrl = process.env["VERCEL_PROJECT_PRODUCTION_URL"]
  const siteUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ??
    process.env["NEXT_PUBLIC_SITE_URL"] ??
    (vercelUrl ? `https://${vercelUrl}` : DEFAULT_SITE_URL)

  try {
    return new URL(siteUrl)
  } catch {
    return new URL(DEFAULT_SITE_URL)
  }
}

function getApiBaseUrl() {
  return (process.env["NEXT_PUBLIC_API_URL"] ?? DEFAULT_API_URL).replace(/\/$/, "")
}

export function getFullTitle(title: string) {
  return title === APP_NAME ? APP_NAME : `${title} | ${APP_NAME}`
}

export async function getCurrentCompanyName() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  if (!cookieHeader) return null

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    })

    if (!response.ok) return null

    const payload = (await response.json()) as AuthMeMetadataResponse
    const companyName = payload.data?.user?.onboarding?.companyName

    if (typeof companyName !== "string") return null

    const trimmedCompanyName = companyName.trim()
    return trimmedCompanyName || null
  } catch {
    return null
  }
}

export function createPageMetadata({
  title,
  absoluteTitle,
  description = APP_DESCRIPTION,
  path,
  noIndex = false,
}: CreatePageMetadataOptions): Metadata {
  const fullTitle = absoluteTitle ?? getFullTitle(title)

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      siteName: APP_NAME,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  }
}