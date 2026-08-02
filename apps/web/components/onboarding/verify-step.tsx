"use client"

import * as React from "react"
import { CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@hookscope/ui/lib/utils"
import { Button } from "@hookscope/ui/components/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@hookscope/ui/components/input-otp"
import { getRequestErrorMessage } from "@/lib/http"
import { useSendVerificationOtpMutation, useVerifyEmailMutation } from "@/hooks/use-auth"

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]
const spring = { type: "spring", stiffness: 400, damping: 28 } as const

interface VerifyStepProps {
  email: string
  emailVerified: boolean
  onContinue: () => void
}

type StepState = "idle" | "otp-sent" | "verified"

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

function FadeUp({
  index = 0,
  className,
  children,
}: {
  index?: number
  className?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduceMotion ? 0 : 0.08 + index * 0.06,
        duration: 0.3,
        ease: EASE_OUT,
      }}
    >
      {children}
    </motion.div>
  )
}

export function VerifyStep({ email, emailVerified, onContinue }: VerifyStepProps) {
  const sendMutation = useSendVerificationOtpMutation()
  const verifyMutation = useVerifyEmailMutation()

  const [state, setState] = React.useState<StepState>(emailVerified ? "verified" : "idle")
  const [otp, setOtp] = React.useState("")
  const [otpError, setOtpError] = React.useState<string | null>(null)
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
      setOtpError(null)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  const onVerifySuccess = React.useCallback((result: { message: string }) => {
    toast.success(result.message)
    setState("verified")
    setOtpError(null)
  }, [])

  const onVerifyError = React.useCallback((err: unknown) => {
    setOtpError(getRequestErrorMessage(err))
    setOtp("")
  }, [])

  const submitOtp = React.useCallback(
    (code: string) => {
      verifyMutation.mutate(code, { onSuccess: onVerifySuccess, onError: onVerifyError })
    },
    [verifyMutation, onVerifySuccess, onVerifyError]
  )

  // Auto-submit when all 6 digits are entered
  React.useEffect(() => {
    if (state === "otp-sent" && otp.length === OTP_LENGTH) {
      submitOtp(otp)
    }
  }, [otp, state, submitOtp])

  if (state === "verified") {
    return (
      <div className="space-y-6">
        <FadeUp index={0}>
          <div className="flex items-start gap-4 rounded-xl border border-success/30 bg-success/5 p-5">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, ...spring }}
              className="shrink-0"
            >
              <CheckCircle2 className="mt-0.5 size-5 text-success" />
            </motion.span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-success">Email verified</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your email address is confirmed. You&rsquo;re all set to continue.
              </p>
            </div>
          </div>
        </FadeUp>
        <FadeUp index={1}>
          <Button className="min-h-11 w-full" size="lg" onClick={onContinue}>
            Continue
          </Button>
        </FadeUp>
      </div>
    )
  }

  if (state === "otp-sent") {
    return (
      <div className="space-y-6">
        <FadeUp index={0}>
          <div className="flex items-start gap-4 rounded-xl border p-5">
            <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Check your inbox</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>. Enter it below — it
                expires in 5 minutes.
              </p>
            </div>
          </div>
        </FadeUp>

        <FadeUp index={1}>
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={(value) => {
                setOtp(value)
                if (otpError) setOtpError(null)
              }}
              disabled={verifyMutation.isPending}
              aria-invalid={!!otpError}
              aria-describedby={otpError ? "otp-error" : undefined}
            >
              <InputOTPGroup>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {otpError && (
              <p
                id="otp-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {otpError}
              </p>
            )}

            <Button
              className="min-h-11 w-full"
              size="lg"
              onClick={() => submitOtp(otp)}
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
        </FadeUp>

        <FadeUp index={2}>
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSend}
              disabled={cooldown > 0 || sendMutation.isPending}
              className="min-h-11 px-4 text-muted-foreground"
            >
              <RefreshCw className={cn("mr-1.5 size-3.5", sendMutation.isPending && "animate-spin")} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
          </div>
        </FadeUp>

        <FadeUp index={3}>
          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              className="min-h-11 text-xs text-muted-foreground"
              onClick={onContinue}
            >
              Skip for now
            </Button>
          </div>
        </FadeUp>
      </div>
    )
  }

  // idle state
  return (
    <div className="space-y-6">
      <FadeUp index={0}>
        <div className="flex items-start gap-4 rounded-xl border border-warning/30 bg-warning/5 p-5">
          <Mail className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-warning-foreground">Verification pending</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verify <span className="font-medium text-foreground">{email}</span> to confirm your
              account and unlock all features.
            </p>
          </div>
        </div>
      </FadeUp>

      <FadeUp index={1}>
        <Button
          className="min-h-11 w-full"
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
      </FadeUp>

      <FadeUp index={2}>
        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            className="min-h-11 text-xs text-muted-foreground"
            onClick={onContinue}
          >
            Skip for now
          </Button>
        </div>
      </FadeUp>
    </div>
  )
}
