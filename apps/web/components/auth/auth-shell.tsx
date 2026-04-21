import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
}

function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-16 -left-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-0 right-0 h-104 w-104 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-muted blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <div className="relative h-8 w-32 overflow-hidden">
              <Image src="/logo-light.png" alt="HookScope" fill className="object-cover object-center dark:hidden" />
              <Image src="/logo-dark.png" alt="HookScope" fill className="object-cover object-center hidden dark:block" />
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <section className="mx-auto mt-10 grid w-full flex-1 items-center gap-10 lg:grid-cols-[1fr_460px] lg:gap-16">
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Sparkles className="size-3.5 text-primary" />
                secure event delivery
              </p>
              <h2 className="font-heading text-4xl leading-tight font-semibold text-foreground">
                From incoming hooks to reliable delivery trails.
              </h2>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                Sign in to monitor ingestion health, inspect payload timelines,
                and debug failed deliveries with a clean event-by-event audit
                path.
              </p>
              <div className="mt-8 grid gap-3 text-sm">
                <FeatureLine label="Per-endpoint observability" />
                <FeatureLine label="Payload snapshots + replay" />
                <FeatureLine label="Delivery retry intelligence" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-lg backdrop-blur sm:p-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}

function FeatureLine({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="inline-flex size-2 rounded-full bg-primary" />
      <span>{label}</span>
    </div>
  )
}

export { AuthShell }
