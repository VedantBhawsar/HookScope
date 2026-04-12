"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { getRequestErrorMessage } from "@/lib/http"
import {
  useCreateEndpointMutation,
  type CreateEndpointPayload,
} from "@/hooks/use-endpoints"
import { setActiveEndpointForProject } from "@/lib/endpoint-selection"

const SOURCE_OPTIONS = [
  { label: "Stripe", value: "STRIPE" },
  { label: "GitHub", value: "GITHUB" },
  { label: "Shopify", value: "SHOPIFY" },
  { label: "Slack", value: "SLACK" },
  { label: "Twilio", value: "TWILIO" },
  { label: "Generic", value: "GENERIC" },
] as const

interface CreateEndpointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
  projectName?: string
  /** Called after a successful endpoint creation, before the dialog closes. */
  onCreated?: () => void
}

export function CreateEndpointDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onCreated,
}: CreateEndpointDialogProps) {
  const createEndpointMutation = useCreateEndpointMutation()

  const [name, setName] = React.useState("")
  const [source, setSource] = React.useState<CreateEndpointPayload["source"]>("GENERIC")
  const [destinationUrl, setDestinationUrl] = React.useState("")

  const previousOpenRef = React.useRef(open)

  React.useEffect(() => {
    const wasOpen = previousOpenRef.current

    if (wasOpen && !open) {
      setName("")
      setSource("GENERIC")
      setDestinationUrl("")
      createEndpointMutation.reset()
    }

    previousOpenRef.current = open
  }, [open, createEndpointMutation])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!projectId) return

    try {
      const endpoint = await createEndpointMutation.mutateAsync({
        projectId,
        name: name.trim(),
        source,
        destinationUrl: destinationUrl.trim(),
      })

      setActiveEndpointForProject(projectId, {
        id: endpoint.id,
        name: endpoint.name,
      })

      toast.success("Endpoint created")
      onCreated?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Endpoint</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {projectName ? `Project: ${projectName}` : "Select a project before creating an endpoint."}
          </p>
        </DialogHeader>

        <form id="create-endpoint-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="endpoint-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="endpoint-name"
              required
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Payments Primary"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="endpoint-source" className="text-sm font-medium">
              Source <span className="text-destructive">*</span>
            </label>
            <Select value={source} onValueChange={(value) => setSource(value as CreateEndpointPayload["source"])}>
              <SelectTrigger id="endpoint-source" aria-label="Select endpoint source" className="w-full">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectLabel>Providers</SelectLabel>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="endpoint-destination" className="text-sm font-medium">
              Destination URL <span className="text-destructive">*</span>
            </label>
            <input
              id="endpoint-destination"
              required
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder="https://example.com/webhooks/receiver"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-endpoint-form"
            disabled={createEndpointMutation.isPending || !projectId || !name.trim() || !destinationUrl.trim()}
          >
            {createEndpointMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {createEndpointMutation.isPending ? "Creating…" : "Create Endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
