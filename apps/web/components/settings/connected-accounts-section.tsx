"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Github, Loader2, LinkIcon, Unlink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@hookscope/ui/components/button"
import { Separator } from "@hookscope/ui/components/separator"
import { ConfirmDeleteDialog } from "@hookscope/ui/components/confirm-delete-dialog"
import { useLinkedAccountsQuery, useUnlinkAccountMutation } from "@/hooks/use-auth"
import { getRequestErrorMessage } from "@/lib/http"

const API_BASE = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:5000").replace(/\/$/, "")

const PROVIDERS = [
  {
    id: "GOOGLE" as const,
    label: "Google",
    description: "Sign in with your Google account",
    icon: GoogleIcon,
    linkUrl: `${API_BASE}/api/auth/oauth/google/link`,
  },
  {
    id: "GITHUB" as const,
    label: "GitHub",
    description: "Sign in with your GitHub account",
    icon: GithubIcon,
    linkUrl: `${API_BASE}/api/auth/oauth/github/link`,
  },
]

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return <Github className={className} />
}

export function ConnectedAccountsSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, isLoading } = useLinkedAccountsQuery()
  const unlinkMutation = useUnlinkAccountMutation()
  const [unlinkTarget, setUnlinkTarget] = React.useState<string | null>(null)

  // Handle redirect back from OAuth link / error
  React.useEffect(() => {
    const linked = searchParams.get("linked")
    const linkError = searchParams.get("link_error")

    if (linked) {
      toast.success(`${linked.charAt(0).toUpperCase() + linked.slice(1)} account connected`)
      router.replace("/settings")
    } else if (linkError) {
      const messages: Record<string, string> = {
        already_linked: "This account is already connected.",
        provider_taken: "This social account is linked to a different user.",
        state_mismatch: "Security check failed. Please try again.",
        oauth_failed: "Connection failed. Please try again.",
      }
      toast.error(messages[linkError] ?? "Connection failed. Please try again.")
      router.replace("/settings")
    }
  }, [searchParams, router])

  const linkedProviders = new Set(data?.accounts.map((a) => a.provider) ?? [])

  const handleUnlink = async () => {
    if (!unlinkTarget) return
    try {
      const result = await unlinkMutation.mutateAsync(unlinkTarget)
      toast.success(result.message)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    } finally {
      setUnlinkTarget(null)
    }
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold">Connected accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link social accounts so you can sign in with a single click.
        </p>
      </div>
      <Separator />

      <div className="divide-y">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon
          const isLinked = linkedProviders.has(provider.id)
          const linkedAt = data?.accounts.find((a) => a.provider === provider.id)?.linkedAt

          return (
            <div key={provider.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <Icon className="size-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{provider.label}</p>
                <p className="text-xs text-muted-foreground">
                  {isLinked && linkedAt
                    ? `Connected ${new Date(linkedAt).toLocaleDateString()}`
                    : provider.description}
                </p>
              </div>

              {isLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : isLinked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkTarget(provider.id)}
                  className="gap-1.5"
                >
                  <Unlink className="size-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { window.location.href = provider.linkUrl }}
                  className="gap-1.5"
                >
                  <LinkIcon className="size-3.5" />
                  Connect
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDeleteDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => { if (!open) setUnlinkTarget(null) }}
        entityName="account"
        entityLabel={unlinkTarget ?? ""}
        onConfirm={handleUnlink}
        isPending={unlinkMutation.isPending}
      />
    </section>
  )
}
