"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { useUpdateProfileMutation, type AuthUser } from "@/hooks/use-auth"
import { getRequestErrorMessage } from "@/lib/http"

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const
const COMPANY_ROLES = ["Engineering", "Product", "DevOps", "Founder", "Other"] as const
const USE_CASES = [
  "Payment & billing",
  "CI/CD & deployment",
  "E-commerce",
  "Customer notifications",
  "Internal tooling",
  "Other",
] as const

const workspaceSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companySize: z.string().optional(),
  companyRole: z.string().optional(),
  useCase: z.string().optional(),
})

type WorkspaceFormValues = z.infer<typeof workspaceSchema>

interface WorkspaceSectionProps {
  user: AuthUser
}

export function WorkspaceSection({ user }: WorkspaceSectionProps) {
  const mutation = useUpdateProfileMutation()

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      companyName: user.onboarding.companyName ?? "",
      companySize: user.onboarding.companySize ?? "",
      companyRole: user.onboarding.companyRole ?? "",
      useCase: user.onboarding.useCase ?? "",
    },
  })

  const onSubmit = async (values: WorkspaceFormValues) => {
    try {
      const result = await mutation.mutateAsync(values)
      toast.success(result.message ?? "Workspace updated")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Workspace</h2>
      <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPANY_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="useCase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary use case</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select use case" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USE_CASES.map((uc) => (
                          <SelectItem key={uc} value={uc}>
                            {uc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </section>
  )
}
