"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import type { ComponentType } from "react"
import {
  Activity,
  Bell,
  Check,
  ChevronsUpDown,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Search,
  Settings,
  UserCircle,
  Webhook,
} from "lucide-react"
import type { AuthUser } from "@/hooks/use-auth"
import type { EndpointRecord } from "@/hooks/use-endpoints"
import type { ProjectRecord } from "@/hooks/use-projects"
import { Button } from "@hookscope/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hookscope/ui/components/dropdown-menu"
import { cn } from "@hookscope/ui/lib/utils"
import { Input } from "@hookscope/ui/components/input"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { SectionLabel } from "@/components/layout/section-label"

interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

interface DashboardNavItem extends NavItem {
  segment: string
}

const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { label: "Overview", segment: "", href: "", icon: LayoutDashboard },
  { label: "Events", segment: "/events", href: "/events", icon: Webhook },
  { label: "Deliveries", segment: "/deliveries", href: "/deliveries", icon: Activity },
  { label: "Alerts", segment: "/alerts", href: "/alerts", icon: Bell },
  { label: "Endpoint settings", segment: "/settings", href: "/settings", icon: Settings },
]

const WORKSPACE_NAV_ITEMS: readonly NavItem[] = [
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Account settings", href: "/settings", icon: Settings },
]

interface SidebarContextProps {
  user: AuthUser
  onOpenAvatarUpload: () => void
  onLogout: () => void
  isLogoutPending: boolean
}

interface SidebarDashboardProps extends SidebarContextProps {
  mode: "dashboard"
  selectedProject: ProjectRecord | null
  endpoints: EndpointRecord[]
  selectedEndpointId: string | null
  isLoadingEndpoints: boolean
  endpointsErrorMessage: string | null
  onSelectProject: (projectId: string) => void
  onSelectEndpoint: (endpointId: string) => void
  onCreateEndpoint: () => void
}

export type SidebarProps = SidebarContextProps | SidebarDashboardProps

const SIDEBAR_CLASSES =
  "hidden border-r border-border/70 bg-card/50 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto"

function isDashboardProps(props: SidebarProps): props is SidebarDashboardProps {
  return (props as SidebarDashboardProps).mode === "dashboard"
}

function SidebarBranding() {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
      <div className="relative h-9 w-36 overflow-hidden">
        <Image src="/logo-light.png" alt="HookScope" fill priority className="object-cover object-center dark:hidden" />
        <Image src="/logo-dark.png" alt="HookScope" fill priority className="object-cover object-center hidden dark:block" />
      </div>
    </div>
  )
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
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
}

function WorkspaceNav() {
  const pathname = usePathname()
  return (
    <div>
      <SectionLabel className="mb-2 px-3">Workspace</SectionLabel>
      <nav className="flex flex-col gap-1">
        {WORKSPACE_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return <NavLink key={item.href} item={item} isActive={isActive} />
        })}
      </nav>
    </div>
  )
}

interface EndpointSwitcherProps {
  endpoints: EndpointRecord[]
  selectedEndpointId: string | null
  isLoadingEndpoints: boolean
  endpointsErrorMessage: string | null
  onSelectEndpoint: (endpointId: string) => void
  onCreateEndpoint: () => void
}

function EndpointSwitcher({
  endpoints,
  selectedEndpointId,
  isLoadingEndpoints,
  endpointsErrorMessage,
  onSelectEndpoint,
  onCreateEndpoint,
}: EndpointSwitcherProps) {
  const [endpointSearch, setEndpointSearch] = React.useState("")
  const { selectedProjectId } = useDashboardProjectContext()

  const selectedEndpoint = React.useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId]
  )

  const selectedEndpointName =
    selectedEndpoint?.name ?? (isLoadingEndpoints ? "Loading endpoints..." : "No endpoint yet")
  const selectedEndpointMeta = selectedEndpoint
    ? `${selectedEndpoint.source} · ${selectedEndpoint.status}`
    : "Create an endpoint to begin receiving and forwarding webhooks."

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
    <div className="rounded-xl border border-border bg-card p-2.5">
      <SectionLabel className="px-1">Endpoint</SectionLabel>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="mt-1.5 h-auto w-full justify-between px-2.5 py-2"
          >
            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-medium">{selectedEndpointName}</p>
              <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                {selectedEndpointMeta}
              </p>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-65">
          <DropdownMenuGroup>
            <div className="px-2 pb-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
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
                    <DropdownMenuItem
                      key={endpoint.id}
                      onSelect={() => onSelectEndpoint(endpoint.id)}
                    >
                      {isActive ? (
                        <Check data-icon="inline-start" />
                      ) : (
                        <span className="size-4" />
                      )}
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
        disabled={!selectedProjectId}
      >
        Create Endpoint
      </Button>
      {endpointsErrorMessage ? (
        <p className="mt-1.5 text-[11px] text-destructive">{endpointsErrorMessage}</p>
      ) : null}
    </div>
  )
}

interface ProjectSwitcherProps {
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
}

function ProjectSwitcher({ selectedProjectId, onSelectProject }: ProjectSwitcherProps) {
  const { projects, isLoading } = useDashboardProjectContext()

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null

  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <SectionLabel className="px-1">Project</SectionLabel>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="mt-1.5 h-auto w-full justify-between px-2.5 py-2"
          >
            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-medium">
                {selectedProject?.name ?? "Select project"}
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                {selectedProject
                  ? `${selectedProject.endpointCount} endpoint${selectedProject.endpointCount === 1 ? "" : "s"}`
                  : "Switch between project dashboards"}
              </p>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            {isLoading ? (
              <DropdownMenuItem disabled>
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
                Loading projects...
              </DropdownMenuItem>
            ) : null}

            {!isLoading && projects.length === 0 ? (
              <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
            ) : null}

            {!isLoading
              ? projects.map((project) => {
                  const isActive = project.id === selectedProjectId
                  return (
                    <DropdownMenuItem
                      key={project.id}
                      onSelect={() => onSelectProject(project.id)}
                    >
                      {isActive ? (
                        <Check data-icon="inline-start" />
                      ) : (
                        <span className="size-4" />
                      )}
                      <span className="truncate">{project.name}</span>
                    </DropdownMenuItem>
                  )
                })
              : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function EndpointNav({
  selectedProjectId,
  selectedEndpointId,
}: {
  selectedProjectId: string | null
  selectedEndpointId: string | null
}) {
  const pathname = usePathname()

  return (
    <div>
      <SectionLabel className="mb-2 px-3">Endpoint</SectionLabel>
      <nav className="flex flex-col gap-1">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const projectBaseHref =
            selectedProjectId && selectedEndpointId
              ? `/dashboard/${selectedProjectId}/${selectedEndpointId}`
              : "/projects"
          const href =
            selectedProjectId && selectedEndpointId
              ? `${projectBaseHref}${item.segment}`
              : item.href
          const isActive =
            item.segment === ""
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <NavLink
              key={`${href}-${item.label}`}
              item={{ label: item.label, href, icon: item.icon }}
              isActive={isActive}
            />
          )
        })}
      </nav>
    </div>
  )
}

interface SidebarUserMenuProps {
  user: AuthUser
  onOpenAvatarUpload: () => void
  onLogout: () => void
  isLogoutPending: boolean
}

function SidebarUserMenu({ user, onOpenAvatarUpload, onLogout, isLogoutPending }: SidebarUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="mt-4 h-auto w-full justify-start px-3 py-2.5"
        >
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
            <Link href="/settings">
              <Settings data-icon="inline-start" />
              Account settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={onLogout}
            disabled={isLogoutPending}
          >
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
  )
}

function DashboardContextNav(props: SidebarDashboardProps) {
  const { selectedProject, endpoints, selectedEndpointId } = props

  return (
    <>
      <ProjectSwitcher
        selectedProjectId={selectedProject?.id ?? null}
        onSelectProject={props.onSelectProject}
      />
      <EndpointSwitcher
        endpoints={endpoints}
        selectedEndpointId={selectedEndpointId}
        isLoadingEndpoints={props.isLoadingEndpoints}
        endpointsErrorMessage={props.endpointsErrorMessage}
        onSelectEndpoint={props.onSelectEndpoint}
        onCreateEndpoint={props.onCreateEndpoint}
      />
      <div className="my-1 h-px bg-border/60" />
      <EndpointNav
        selectedProjectId={selectedProject?.id ?? null}
        selectedEndpointId={selectedEndpointId}
      />
      <div className="my-1 h-px bg-border/60" />
    </>
  )
}

export function SidebarBody(props: SidebarProps) {
  return (
    <>
      <SidebarBranding />

      <div className="flex flex-1 flex-col gap-6">
        {isDashboardProps(props) ? <DashboardContextNav {...props} /> : null}
        <WorkspaceNav />
      </div>

      <SidebarUserMenu
        user={props.user}
        onOpenAvatarUpload={props.onOpenAvatarUpload}
        onLogout={props.onLogout}
        isLogoutPending={props.isLogoutPending}
      />
    </>
  )
}

export function DashboardSidebar(props: SidebarProps) {
  return (
    <aside className={SIDEBAR_CLASSES}>
      <SidebarBody {...props} />
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
