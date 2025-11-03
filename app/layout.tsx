import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

import { Vazirmatn } from "next/font/google"


const _vazir = Vazirmatn({ subsets: ["arabic"], weight: ["400", "700"] })

export const metadata: Metadata = {
  title: "Invoice Generator - Yemen Transport",
  description: "Transport Weighing Invoice Generator",
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
