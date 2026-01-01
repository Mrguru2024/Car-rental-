export interface SeedVehicle {
  id: string
  make: string
  model: string
  year: number
  price_per_day: number
  location: string
  description: string
  mileage_limit?: number | null
  status: 'active' | 'inactive'
  vehicle_photos?: Array<{ file_path: string }>
}

export const seedVehicles: SeedVehicle[] = [
  {
    id: 'seed-1',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    price_per_day: 45,
    location: 'Atlanta, GA',
    description: 'Reliable and fuel-efficient sedan perfect for city driving.',
    mileage_limit: 200,
    status: 'active',
  },
  {
    id: 'seed-2',
    make: 'Honda',
    model: 'Accord',
    year: 2023,
    price_per_day: 48,
    location: 'Atlanta, GA',
    description: 'Comfortable mid-size sedan with advanced safety features.',
    mileage_limit: 250,
    status: 'active',
  },
  {
    id: 'seed-3',
    make: 'Ford',
    model: 'F-150',
    year: 2022,
    price_per_day: 75,
    location: 'Atlanta, GA',
    description: 'Powerful pickup truck ideal for hauling and towing.',
    mileage_limit: 300,
    status: 'active',
  },
  {
    id: 'seed-4',
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    price_per_day: 85,
    location: 'Atlanta, GA',
    description: 'Electric sedan with autopilot and premium interior.',
    mileage_limit: 400,
    status: 'active',
  },
  {
    id: 'seed-5',
    make: 'BMW',
    model: '3 Series',
    year: 2022,
    price_per_day: 95,
    location: 'Atlanta, GA',
    description: 'Luxury sedan with sporty performance and premium features.',
    mileage_limit: 150,
    status: 'active',
  },
  {
    id: 'seed-6',
    make: 'Jeep',
    model: 'Wrangler',
    year: 2023,
    price_per_day: 70,
    location: 'Atlanta, GA',
    description: 'Iconic off-road SUV perfect for adventure seekers.',
    mileage_limit: 350,
    status: 'active',
  },
]