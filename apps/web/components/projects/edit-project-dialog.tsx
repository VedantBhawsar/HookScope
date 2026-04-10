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
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editName: string
  editDescription: string
  onEditNameChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  isPending: boolean
  errorMessage: string | null
}

export function EditProjectDialog({
  open,
  onOpenChange,
  editName,
  editDescription,
  onEditNameChange,
  onEditDescriptionChange,
  onSubmit,
  onCancel,
  isPending,
  errorMessage,
}: EditProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form id="edit-project-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-name"
              required
              autoFocus
              value={editName}
              onChange={(event) => onEditNameChange(event.target.value)}
              placeholder="Project name"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="edit-description"
              value={editDescription}
              onChange={(event) => onEditDescriptionChange(event.target.value)}
              placeholder="Project description"
              rows={3}
              className="resize-none"
            />
          </div>
          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form="edit-project-form" disabled={isPending || !editName.trim()}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
