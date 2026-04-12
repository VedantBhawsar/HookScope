"use client"

import * as React from "react"
import { Camera } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"
import { type AuthUser } from "@/hooks/use-auth"

interface ProfileSectionProps {
  user: AuthUser
}

function UserAvatarDisplay({ user }: { user: AuthUser }) {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="size-14 rounded-full object-cover"
      />
    )
  }

  return (
    <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
      {initials}
    </span>
  )
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const [avatarOpen, setAvatarOpen] = React.useState(false)

  return (
    <>
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Profile</h2>
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatarDisplay user={user} />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="absolute -bottom-1 -right-1 size-6 rounded-full"
                onClick={() => setAvatarOpen(true)}
              >
                <Camera className="size-3" />
              </Button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <AvatarUploadDialog
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        currentAvatarUrl={user.avatarUrl}
        userName={user.name}
      />
    </>
  )
}
