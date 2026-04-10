"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Input } from "@workspace/ui/components/input"

interface ConfirmDeleteDialogProps {
  /** Controls open state from the parent */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The thing being deleted, e.g. "Project", "Endpoint" — used in the title and description */
  entityName: string
  /** Optional display label for the specific item, e.g. its name/title */
  entityLabel?: string
  /**
   * When provided, an input is shown asking the user to type this exact string
   * before the confirm button enables — like GitHub's project/repo deletion flow.
   * Pass `entityLabel` (the project name) or a keyword like `"delete"`.
   */
  requireConfirmText?: string
  /** Optional warning shown below the confirm input (e.g. cascading deletions) */
  warning?: string
  /** Called when the user confirms deletion */
  onConfirm: () => void
  /** While true, both buttons are disabled and the confirm button shows "Deleting…" */
  isPending?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  entityName,
  entityLabel,
  requireConfirmText,
  warning,
  onConfirm,
  isPending = false,
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = React.useState("")

  // Reset the input whenever the dialog opens or closes
  React.useEffect(() => {
    if (!open) setInputValue("")
  }, [open])

  const displayTarget = entityLabel ? `"${entityLabel}"` : `this ${entityName.toLowerCase()}`
  const confirmBlocked = requireConfirmText !== undefined && inputValue !== requireConfirmText

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {entityName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {displayTarget}? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireConfirmText !== undefined && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-mono font-semibold text-foreground">
                {requireConfirmText}
              </span>{" "}
              to confirm.
            </p>
            <Input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              placeholder={requireConfirmText}
              disabled={isPending}
              aria-label={`Type ${requireConfirmText} to confirm deletion`}
            />
          </div>
        )}

        {warning && (
          <p className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span className="mt-px leading-none">⚠</span>
            <span>{warning}</span>
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending || confirmBlocked}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50"
          >
            {isPending ? "Deleting…" : `Delete ${entityName}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
