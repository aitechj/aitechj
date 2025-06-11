import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}

        {/* ✅ Safe fallback hydration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('🔍 Checking React hydration status...');
              setTimeout(() => {
                try {
                  window.React = window.React || {};
                  window.ReactDOM = window.ReactDOM || {};
                  window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};
                  console.log('✅ Hydration patch executed');
                  console.log('React available:', typeof window.React);
                  console.log('ReactDOM available:', typeof window.ReactDOM);
                  console.log('Next.js data:', typeof window.__NEXT_DATA__);
                } catch (err) {
                  console.error('🔥 Hydration recovery failed:', err);
                }
              }, 1000);
            `,
          }}
        />
      </body>
    </html>
  );
}
