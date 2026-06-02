import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sub-Con Dashboard',
  description: 'A sampling project to provide clients with comprehensive data based on input from sub-con',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
