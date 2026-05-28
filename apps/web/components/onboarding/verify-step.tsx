"use client"

import * as React from "react"
import { CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@hookscope/ui/lib/utils"
import { Button } from "@hookscope/ui/components/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@hookscope/ui/components/input-otp"
import { getRequestErrorMessage } from "@/lib/http"
import { useSendVerificationOtpMutation, useVerifyEmailMutation } from "@/hooks/use-auth"

interface VerifyStepProps {
  email: string
  emailVerified: boolean
  onContinue: () => void
}

type StepState = "idle" | "otp-sent" | "verified"

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

export function VerifyStep({ email, emailVerified, onContinue }: VerifyStepProps) {
  const sendMutation = useSendVerificationOtpMutation()
  const verifyMutation = useVerifyEmailMutation()

  const [state, setState] = React.useState<StepState>(emailVerified ? "verified" : "idle")
  const [otp, setOtp] = React.useState("")
  const [cooldown, setCooldown] = React.useState(0)

  // Tick the resend cooldown
  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSend = async () => {
    try {
      const result = await sendMutation.mutateAsync()
      toast.success(result.message)
      setState("otp-sent")
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setOtp("")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) return
    try {
      const result = await verifyMutation.mutateAsync(otp)
      toast.success(result.message)
      setState("verified")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
      setOtp("")
    }
  }

  // Auto-submit when all 6 digits are entered
  React.useEffect(() => {
    if (state === "otp-sent" && otp.length === OTP_LENGTH) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  if (state === "verified") {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-700">Email verified</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your email address is confirmed. You&rsquo;re all set to continue.
            </p>
          </div>
        </div>
        <Button className="w-full" size="lg" onClick={onContinue}>
          Continue
        </Button>
      </div>
    )
  }

  if (state === "otp-sent") {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-xl border p-5">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Check your inbox</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
              Enter it below — it expires in 5 minutes.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={setOtp}
            disabled={verifyMutation.isPending}
          >
            <InputOTPGroup>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            className="w-full"
            size="lg"
            onClick={handleVerify}
            disabled={otp.length < OTP_LENGTH || verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 size-4" />
                Verify
              </>
            )}
          </Button>
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSend}
            disabled={cooldown > 0 || sendMutation.isPending}
            className="text-muted-foreground"
          >
            <RefreshCw className={cn("mr-1.5 size-3.5", sendMutation.isPending && "animate-spin")} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </Button>
        </div>

        <div className="text-center">
          <Button variant="link" size="sm" className="text-xs text-muted-foreground" onClick={onContinue}>
            Skip for now
          </Button>
        </div>
      </div>
    )
  }

  // idle state
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <Mail className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-700">Verification pending</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Verify <span className="font-medium text-foreground">{email}</span> to confirm your account
            and unlock all features.
          </p>
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleSend}
        disabled={sendMutation.isPending}
      >
        {sendMutation.isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Mail className="mr-2 size-4" />
            Send verification code
          </>
        )}
      </Button>

      <div className="text-center">
        <Button variant="link" size="sm" className="text-xs text-muted-foreground" onClick={onContinue}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
