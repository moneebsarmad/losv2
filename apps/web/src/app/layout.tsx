import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './providers'
import { APP_NAME, SCHOOL_NAME } from '@/lib/constants/formation'

export const metadata: Metadata = {
  title: `${APP_NAME} | ${SCHOOL_NAME}`,
  description: 'BHA recognition, house culture, and 3R formation portal.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
