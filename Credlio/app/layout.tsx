import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Credlio - Lend Safely. Check First.",
  description: "Build trust before you lend or borrow. Comprehensive credit verification and risk assessment platform for secure lending decisions.",
  keywords: "credit verification, lending platform, risk assessment, credit reports, secure lending, borrower verification, trust platform",
  authors: [{ name: "Credlio" }],
  openGraph: {
    title: "Credlio - Lend Safely. Check First.",
    description: "Build trust before you lend or borrow. Comprehensive credit verification platform.",
    url: "https://credlio.com",
    siteName: "Credlio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Credlio - Secure Lending Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Credlio - Lend Safely. Check First.",
    description: "Build trust before you lend or borrow. Comprehensive credit verification platform.",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
