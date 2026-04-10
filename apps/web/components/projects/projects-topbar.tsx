import { ChevronDown, LoaderCircle, LogOut, Webhook } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import type { AuthUser } from "@/hooks/use-auth"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

interface ProjectsTopbarProps {
  user: AuthUser | null
  isLogoutPending: boolean
  onLogout: () => void
}

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

export function ProjectsTopbar({ user, isLogoutPending, onLogout }: ProjectsTopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <Webhook className="size-4 text-primary-foreground" />
        </div>
        <span className="hidden text-sm font-semibold tracking-tight sm:block">HookBase</span>
      </div>

      <div className="flex-1" />

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
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={onLogout}
              disabled={isLogoutPending}
            >
              {isLogoutPending ? (
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
