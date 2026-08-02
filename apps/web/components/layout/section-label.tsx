import { cn } from "@hookscope/ui/lib/utils"

interface SectionLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function SectionLabel({ className, children, ...props }: SectionLabelProps) {
  return (
    <p
      className={cn("text-xs uppercase tracking-[0.18em] text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
}
