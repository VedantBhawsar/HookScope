import type { Metadata } from "next"
import { Geist_Mono, Inter, Space_Grotesk, Space_Mono } from "next/font/google"

import "@hookscope/ui/globals.css"
import "./landing.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { PricingProvider } from "@/components/providers/pricing-provider"
import { Toaster } from "@hookscope/ui/components/sonner"
import { cn } from "@hookscope/ui/lib/utils"
import { APP_DESCRIPTION, APP_NAME, getMetadataBase } from "./metadata"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, inter.variable, spaceGrotesk.variable, spaceMono.variable)}
    >
      <body>
        <ThemeProvider defaultTheme="system">
          <QueryProvider>
            <PricingProvider>{children}</PricingProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
