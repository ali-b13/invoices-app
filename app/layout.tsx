import type React from "react"
import type { Metadata } from "next"
import { Viewport } from 'next'
import "./globals.css"

import { Vazirmatn } from "next/font/google"


const _vazir = Vazirmatn({ subsets: ["arabic"], weight: ["400", "700"] })




export const metadata: Metadata = {
  title: 'Invoice Management App',
  description: 'A progressive web app for managing invoices',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InvoiceApp',
  },
}

export const viewport: Viewport = {
  themeColor: '#00008B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`font-sans ${_vazir.className}`}>{children}</body>
    </html>
  )
}
