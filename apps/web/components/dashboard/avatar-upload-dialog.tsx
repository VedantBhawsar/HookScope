"use client"

import * as React from "react"
import { ImageIcon, LoaderCircle, Upload, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { getRequestErrorMessage } from "@/lib/http"
import { useUploadAvatarMutation } from "@/hooks/use-auth"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE_MB = 5

interface AvatarUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAvatarUrl: string | null
  userName: string
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

export function AvatarUploadDialog({ open, onOpenChange, currentAvatarUrl, userName }: AvatarUploadDialogProps) {
  const [preview, setPreview] = React.useState<string | null>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadAvatarMutation()

  const displayUrl = preview ?? currentAvatarUrl

  function handleFileChange(file: File | null) {
    if (!file) return
    setValidationError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setValidationError("Only JPEG, PNG, WebP, or GIF files are allowed.")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setValidationError(`File must be smaller than ${MAX_SIZE_MB} MB.`)
      return
    }

    setSelectedFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange(e.target.files?.[0] ?? null)
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    handleFileChange(e.dataTransfer.files?.[0] ?? null)
  }

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedFile(null)
    setPreview(null)
    setValidationError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleUpload() {
    if (!selectedFile) return
    try {
      await uploadMutation.mutateAsync(selectedFile)
      toast.success("Profile photo updated")
      handleClose()
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  function handleClose() {
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(null)
    setPreview(null)
    setValidationError(null)
    uploadMutation.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile photo</DialogTitle>
          <DialogDescription>Upload a new avatar. Max {MAX_SIZE_MB} MB.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          {/* Current / preview */}
          <div className="relative size-24">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={userName}
                className="size-24 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full border border-border bg-muted text-xl font-semibold text-muted-foreground">
                {getInitials(userName)}
              </div>
            )}
            {preview && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-opacity hover:opacity-90"
                aria-label="Remove selection"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Drop zone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center transition-colors hover:border-primary hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              validationError && "border-destructive hover:border-destructive"
            )}
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Click or drag &amp; drop</p>
              <p className="mt-0.5 text-xs text-muted-foreground">JPEG, PNG, WebP, GIF · max {MAX_SIZE_MB} MB</p>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={handleInputChange}
            aria-label="Upload avatar"
          />

          {validationError && <p className="text-xs text-destructive">{validationError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload />
                Upload photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
