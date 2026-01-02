import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { ToastProvider } from '@/components/Toast/ToastProvider'

export const metadata: Metadata = {
  title: {
    default: 'Carsera',
    template: '%s | Carsera',
  },
  description: 'Carsera — Where Cars Meet Renters. Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs with trusted local dealers.',
  keywords: ['car rental', 'rent a car', 'Atlanta car rental', 'Carsera', 'vehicle rental', 'car sharing'],
  icons: {
    icon: '/media/images/2.svg',
    shortcut: '/media/images/2.svg',
    apple: '/media/images/2.svg',
  },
  openGraph: {
    title: 'Carsera — Where Cars Meet Renters',
    description: 'Carsera — Where Cars Meet Renters. Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs.',
    type: 'website',
    siteName: 'Carsera',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carsera — Where Cars Meet Renters',
    description: 'Carsera — Where Cars Meet Renters. Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs.',
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