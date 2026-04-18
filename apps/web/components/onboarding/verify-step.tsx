import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

interface VerifyStepProps {
  emailVerified: boolean
  onContinue: () => void
}

export function VerifyStep({ emailVerified, onContinue }: VerifyStepProps) {
  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex items-start gap-4 rounded-xl border p-5",
          emailVerified
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        )}
      >
        {emailVerified ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        ) : (
          <MailCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
        )}
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold", emailVerified ? "text-emerald-700" : "text-amber-700")}>
            {emailVerified ? "Email verified" : "Verification pending"}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {emailVerified
              ? "Your email address is confirmed. You're all set to continue."
              : "We sent a verification link to your inbox. You can continue setup now — verify your email anytime to unlock production features."}
          </p>
        </div>
      </div>

      <Button className="w-full gap-2" size="lg" onClick={onContinue}>
        Continue
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}
