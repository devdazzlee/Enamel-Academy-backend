import React from "react"
import "./globals.css"
import type { Metadata } from "next"
import localFont from "next/font/local"
import { AuthHydrator } from "@/components/auth-hydrator"
import { RouteGuard } from "@/components/route-guard"
import "@/lib/debug-api" // Import to expose debug helpers
import { AppProvider } from "@/lib/app-context"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"

const rubik = localFont({
  variable: "--font-rubik",
  display: "swap",
  src: [
    { path: "../fonts/rubik-light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/rubik-lightitalic.ttf", weight: "300", style: "italic" },
    { path: "../fonts/rubik-regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/rubik-italic.ttf", weight: "400", style: "italic" },
    { path: "../fonts/rubik-medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/rubik-mediumitalic.ttf", weight: "500", style: "italic" },
    { path: "../fonts/rubik-bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/rubik-bolditalic.ttf", weight: "700", style: "italic" },
    { path: "../fonts/rubik-black.ttf", weight: "900", style: "normal" },
    { path: "../fonts/rubik-blackitalic.ttf", weight: "900", style: "italic" },
  ],
})

export const metadata: Metadata = {
  title: 'Enamel Academy',
  description: 'Dental Education Platform - CPD Training and Certificates',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/1-01-01-01.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/1-01-01.ico'],
    apple: ['/apple-icon.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${rubik.variable} ${rubik.className} antialiased`}>
        <AppProvider>
          <AuthHydrator />
          <RouteGuard>{children}</RouteGuard>
          <Toaster />
        </AppProvider>
        <Analytics />
      </body>
    </html>
  )
}
