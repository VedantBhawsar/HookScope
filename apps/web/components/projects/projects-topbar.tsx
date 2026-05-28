"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LoaderCircle, LogOut, Settings, Webhook, Zap } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/alerts/notification-bell"
import { useMeQuery, useLogoutMutation } from "@/hooks/use-auth"
import { usePricing } from "@/components/providers/pricing-provider"
import { Button } from "@hookscope/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hookscope/ui/components/dropdown-menu"
import Link from "next/link"

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
      {initials}
    </span>
  )
}

export function ProjectsTopbar() {
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const user = meQuery.data?.user ?? null
  const { isNearEventLimit, isAtEndpointLimit, openUpgradeDialog } = usePricing()
  const showUpgradeNudge = isNearEventLimit || isAtEndpointLimit

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      router.replace("/auth/login")
    } catch {
      router.replace("/auth/login")
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <Webhook className="size-4 text-primary-foreground" />
        </div>
        <Link href={'/projects'} className="hidden text-sm font-semibold tracking-tight sm:block">HookBase</Link>
      </div>

      <div className="flex-1" />

      {showUpgradeNudge && user && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          onClick={() => openUpgradeDialog("You're approaching your plan limits. Upgrade to keep ingesting webhooks.")}
        >
          <Zap className="size-3.5" />
          Upgrade
        </Button>
      )}
      <NotificationBell />
      <ThemeToggle />

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="h-auto gap-2 px-2 py-1.5 text-sm">
              <UserAvatar name={user.name} />
              <span className="hidden max-w-35 truncate font-medium sm:block">{user.name}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-none">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push("/settings")}
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  )
}
