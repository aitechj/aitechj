import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://aitechj.com'),
  title: 'AITechJ - AI-Powered Technical Learning',
  description: 'Master modern tech skills with AI as your personal tutor',
  openGraph: {
    title: 'AITechJ - AI-Powered Technical Learning',
    description: 'Master modern tech skills with AI as your personal tutor',
    url: '/',
    siteName: 'AITechJ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AITechJ - AI-Powered Technical Learning',
    description: 'Master modern tech skills with AI as your personal tutor',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
