"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Camera, LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"
import { useUpdateProfileMutation, type AuthUser } from "@/hooks/use-auth"
import { getRequestErrorMessage } from "@/lib/http"

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

type ProfileFormValues = z.infer<typeof profileSchema>

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
  const mutation = useUpdateProfileMutation()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  })

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const result = await mutation.mutateAsync({ name: values.name })
      toast.success(result.message ?? "Profile updated")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <>
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Profile</h2>
        <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
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

            {/* Name + email */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem className="flex-1">
                    <FormLabel>Email</FormLabel>
                    <Input value={user.email} disabled className="text-muted-foreground" />
                  </FormItem>
                </div>

                <Button type="submit" size="sm" disabled={mutation.isPending} className="shrink-0">
                  {mutation.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
                  Save
                </Button>
              </form>
            </Form>
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
