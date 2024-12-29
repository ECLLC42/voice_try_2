import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenAI Realtime Console',
  description: 'OpenAI Realtime Console Demo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/openai-logomark.svg" />
      </head>
      <body>{children}</body>
    </html>
  )
} 