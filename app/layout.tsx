import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { ToastProvider } from '@/components/Toast/ToastProvider'

export const metadata: Metadata = {
  title: {
    default: 'Drivana',
    template: '%s | Drivana',
  },
  description: 'Rent cars from dealers and private owners in Atlanta. Drivana connects you with trusted local dealers and private hosts for affordable car rentals.',
  keywords: ['car rental', 'rent a car', 'Atlanta car rental', 'Drivana', 'vehicle rental', 'car sharing'],
  openGraph: {
    title: 'Drivana - Rent Cars from Local Dealers',
    description: 'Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs.',
    type: 'website',
    siteName: 'Drivana',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Drivana - Rent Cars from Local Dealers',
    description: 'Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}