/**
 * SEO Metadata for Listing Pages
 */

import { Metadata } from 'next'

export async function generateListingMetadata(
  vehicle: {
    make: string
    model: string
    year: number
    location: string
    price_per_day: number
    description?: string | null
  }
): Promise<Metadata> {
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} - Carsera in ${vehicle.location}`
  const description =
    vehicle.description ||
    `Rent a ${vehicle.year} ${vehicle.make} ${vehicle.model} in ${vehicle.location}. Starting at $${vehicle.price_per_day}/day.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Carsera',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: '@Carsera',
    },
  }
}

export function generateListingJsonLd(vehicle: {
  id: string
  make: string
  model: string
  year: number
  location: string
  price_per_day: number
  description?: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: vehicle.description || `Rent this vehicle on Carsera in ${vehicle.location}`,
    brand: {
      '@type': 'Brand',
      name: vehicle.make,
    },
    manufacturer: {
      '@type': 'Brand',
      name: vehicle.make,
    },
    offers: {
      '@type': 'Offer',
      price: vehicle.price_per_day,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Carsera',
      },
    },
    locationCreated: {
      '@type': 'Place',
      name: vehicle.location,
    },
  }
}
