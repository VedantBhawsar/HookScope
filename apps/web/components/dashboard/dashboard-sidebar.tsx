"use client"

import Link from "next/link"
import * as React from "react"
import type { ComponentType } from "react"
import {
  Check,
  ChevronsUpDown,
  LoaderCircle,
  LogOut,
  Search,
  Settings,
  UserCircle,
} from "lucide-react"
import type { AuthUser } from "@/hooks/use-auth"
import type { EndpointRecord } from "@/hooks/use-endpoints"
import type { ProjectRecord } from "@/hooks/use-projects"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/input"

interface DashboardNavItem {
  label: string
  segment: string
  absoluteHref: string | null
  icon: ComponentType<{ className?: string }>
}

interface DashboardSidebarProps {
  user: AuthUser
  pathname: string
  navItems: readonly DashboardNavItem[]
  selectedProject: ProjectRecord | null
  endpoints: EndpointRecord[]
  selectedEndpointId: string | null
  selectedEndpointName: string | null
  selectedEndpointMeta: string
  isLoadingEndpoints: boolean
  endpointsErrorMessage: string | null
  onSelectEndpoint: (endpointId: string) => void
  onCreateEndpoint: () => void
  onOpenAvatarUpload: () => void
  onLogout: () => void
  isLogoutPending: boolean
}

export function DashboardSidebar({
  user,
  pathname,
  navItems,
  selectedProject,
  endpoints,
  selectedEndpointId,
  selectedEndpointName,
  selectedEndpointMeta,
  isLoadingEndpoints,
  endpointsErrorMessage,
  onSelectEndpoint,
  onCreateEndpoint,
  onOpenAvatarUpload,
  onLogout,
  isLogoutPending,
}: DashboardSidebarProps) {
  const [endpointSearch, setEndpointSearch] = React.useState("")

  const filteredEndpoints = React.useMemo(() => {
    const query = endpointSearch.trim().toLowerCase()
    if (!query) return endpoints

    return endpoints.filter((endpoint) => {
      return (
        endpoint.name.toLowerCase().includes(query) ||
        endpoint.source.toLowerCase().includes(query) ||
        endpoint.status.toLowerCase().includes(query)
      )
    })
  }, [endpointSearch, endpoints])

  return (
    <aside className="hidden border-r border-border/70 bg-card/50 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
      <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Webhook</p>
        <h1 className="mt-1 font-heading text-lg font-semibold">Observability</h1>
      </div>

      <div className="mb-3 rounded-xl border border-border bg-card p-2.5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Endpoint</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="mt-1.5 h-auto w-full justify-between px-2.5 py-2">
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-medium">
                  {selectedEndpointName ?? (isLoadingEndpoints ? "Loading endpoints..." : "No endpoint yet")}
                </p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">{selectedEndpointMeta}</p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-65">
            <DropdownMenuGroup>
              <div className="px-2 pb-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={endpointSearch}
                    onChange={(event) => setEndpointSearch(event.target.value)}
                    placeholder="Search endpoints..."
                    className="h-8 pl-7 text-xs"
                  />
                </label>
              </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {isLoadingEndpoints ? (
                <DropdownMenuItem disabled>
                  <LoaderCircle data-icon="inline-start" className="animate-spin" />
                  Loading endpoints...
                </DropdownMenuItem>
              ) : null}

              {!isLoadingEndpoints && endpoints.length === 0 ? (
                <DropdownMenuItem disabled>No endpoints available</DropdownMenuItem>
              ) : null}

              {!isLoadingEndpoints && endpoints.length > 0 && filteredEndpoints.length === 0 ? (
                <DropdownMenuItem disabled>No matches found</DropdownMenuItem>
              ) : null}

              {!isLoadingEndpoints
                ? filteredEndpoints.map((endpoint) => {
                    const isActive = endpoint.id === selectedEndpointId

                    return (
                      <DropdownMenuItem key={endpoint.id} onSelect={() => onSelectEndpoint(endpoint.id)}>
                        {isActive ? <Check data-icon="inline-start" /> : <span className="size-4" />}
                        <span className="truncate">{endpoint.name}</span>
                      </DropdownMenuItem>
                    )
                  })
                : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={onCreateEndpoint}
          disabled={!selectedProject?.id}
        >
          Create Endpoint
        </Button>
        {endpointsErrorMessage ? <p className="mt-1.5 text-[11px] text-destructive">{endpointsErrorMessage}</p> : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const href = item.absoluteHref
            ? item.absoluteHref
            : selectedProject?.id
              ? `/dashboard/${selectedProject.id}${item.segment}`
              : "/projects"
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="mt-4 h-auto w-full justify-start px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </span>
            <div className="grid min-w-0 flex-1 text-left">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onOpenAvatarUpload}>
              <UserCircle data-icon="inline-start" />
              Change photo
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings data-icon="inline-start" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={onLogout} disabled={isLogoutPending}>
              {isLogoutPending ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <LogOut data-icon="inline-start" />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
