import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Irrigo — Gestion d'arrosage",
  description: "Plateforme de gestion de réseaux d'arrosage automatique pour paysagistes",
  manifest: "/manifest.json",
  icons: { apple: "/icons/icon-192.png" },
}

export const viewport: Viewport = {
  themeColor: "#9ca763",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
