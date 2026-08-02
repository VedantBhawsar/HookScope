"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@hookscope/ui/components/sheet"
import { SidebarBody, type SidebarProps } from "@/components/dashboard/dashboard-sidebar"

type MobileNavProps = SidebarProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange, ...sidebarProps }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <SidebarBody {...sidebarProps} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
