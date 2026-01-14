import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Server Monitor Dashboard',
  description: 'Real-time server monitoring and metrics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-gray-950 text-gray-50">
        {children}
      </body>
    </html>
  )
}
