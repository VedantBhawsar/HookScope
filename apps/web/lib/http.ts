import axios from "axios"
import type { InternalAxiosRequestConfig } from "axios"

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}

const baseURL = process.env["NEXT_PUBLIC_API_URL"]?.replace(/\/$/, "")

if (!baseURL) {
  throw new Error("NEXT_PUBLIC_API_URL is missing. Set it in apps/web/.env")
}

export const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let refreshPromise: Promise<void> | null = null

function shouldTryRefresh(url?: string): boolean {
  if (!url) return false

  return (
    !url.includes("/api/auth/login") &&
    !url.includes("/api/auth/register") &&
    !url.includes("/api/auth/logout") &&
    !url.includes("/api/auth/refresh")
  )
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status as number | undefined
    const requestConfig = error.config as RetriableRequestConfig | undefined

    if (!requestConfig || status !== 401 || requestConfig._retry || !shouldTryRefresh(requestConfig.url)) {
      return Promise.reject(error)
    }

    requestConfig._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = http
          .post("/api/auth/refresh")
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null
          })
      }

      await refreshPromise
      return http(requestConfig)
    } catch {
      return Promise.reject(error)
    }
  }
)

export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === null) {
    throw new Error(response.message || "Request failed")
  }

  return response.data
}

export function getRequestErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message ?? error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong. Please try again."
}