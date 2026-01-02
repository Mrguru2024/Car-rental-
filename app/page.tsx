import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VehicleCard from "@/components/Vehicle/VehicleCard";
import { seedVehicles } from "@/lib/data/seed-vehicles";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import HeroVideo from "@/components/Layout/HeroVideo";
import MileageSlider from "@/app/listings/MileageSlider";
import NearbySearchButton from "@/components/Search/NearbySearchButton";
import ResetFiltersButton from "@/components/Search/ResetFiltersButton";
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Carsera — Where Cars Meet Renters. Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs with trusted local dealers.',
  openGraph: {
    title: 'Carsera — Where Cars Meet Renters',
    description: 'Carsera — Where Cars Meet Renters. Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs with trusted local dealers.',
    type: 'website',
    siteName: 'Carsera',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carsera — Where Cars Meet Renters',
    description: 'Carsera — Where Cars Meet Renters. Rent cars from dealers and private owners in Atlanta. Find the perfect vehicle for your needs with trusted local dealers.',
  },
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch featured vehicles
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*, vehicle_photos(file_path)")
    .eq("status", "active")
    .limit(6)
    .order("created_at", { ascending: false });

  // If no vehicles in database, use seed data as placeholder
  const displayVehicles =
    vehicles && vehicles.length > 0
      ? vehicles
      : seedVehicles.slice(0, 6).map((v, idx) => ({
          id: `placeholder-${idx}`,
          ...v,
          status: "active" as const,
          vehicle_photos: [],
          created_at: new Date().toISOString(),
        }));

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      {/* Header */}
      <Header user={user} />

      {/* Hero Section */}
      <section className="relative bg-brand-navy dark:bg-brand-white py-20 overflow-visible min-h-[500px] flex items-center pb-32">
        {/* Video Background */}
        <HeroVideo videoSrc="/media/videos/43849-437611813.mp4" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full" suppressHydrationWarning>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-brand-white dark:text-brand-navy drop-shadow-lg">
            Rent Cars from Local Dealers
          </h2>
          <p className="text-xl mb-8 text-brand-white/90 dark:text-brand-navy drop-shadow-md">
            Find the perfect vehicle for your needs in Atlanta
          </p>
          <Link
            href="/listings"
            className="inline-block px-8 py-3 bg-brand-white dark:bg-brand-blue text-brand-navy dark:text-white rounded-lg font-medium hover:bg-brand-white/90 dark:hover:bg-brand-blue-dark transition-colors shadow-lg"
          >
            Browse Listings
          </Link>
        </div>
      </section>

      {/* Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 md:-mt-24 relative z-20 w-full">
        <div className="bg-white dark:bg-brand-navy-light rounded-lg shadow-lg dark:shadow-brand-navy/30 p-4 sm:p-6 border border-brand-white dark:border-brand-navy/50 w-full">
          <form
            action="/listings"
            method="get"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full max-w-full"
            suppressHydrationWarning
          >
            <div className="sm:col-span-2 md:col-span-2 lg:col-span-1 xl:col-span-1 w-full min-w-0">
              <label htmlFor="location" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1.5">
                Location
              </label>
              <div className="relative w-full">
                <input
                  id="location"
                  type="text"
                  name="location"
                  placeholder="Atlanta, GA"
                  className="w-full px-3 sm:px-4 py-2 pr-24 sm:pr-28 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 text-sm sm:text-base"
                  defaultValue="Atlanta, GA"
                  suppressHydrationWarning
                />
                <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-10">
                  <NearbySearchButton inputId="location" />
                </div>
              </div>
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="start_date" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1.5">
                Start Date
              </label>
              <input
                id="start_date"
                type="date"
                name="start_date"
                className="w-full px-3 sm:px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 text-sm sm:text-base"
                suppressHydrationWarning
              />
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="end_date" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1.5">
                End Date
              </label>
              <input
                id="end_date"
                type="date"
                name="end_date"
                className="w-full px-3 sm:px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 text-sm sm:text-base"
                suppressHydrationWarning
              />
            </div>
            <MileageSlider />
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-1 xl:col-span-1 flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full min-w-0">
              <button
                type="submit"
                className="w-full xl:flex-1 px-4 py-2.5 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium text-sm sm:text-base whitespace-nowrap flex items-center justify-center min-h-[42px]"
                suppressHydrationWarning
              >
                Search
              </button>
              <ResetFiltersButton />
            </div>
          </form>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy dark:text-brand-white mb-6 sm:mb-8">
          Featured Vehicles
        </h2>
        {displayVehicles && displayVehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {displayVehicles.map((vehicle: any) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-8 sm:p-12 text-center border border-brand-white dark:border-brand-navy/50">
            <svg
              className="w-16 h-16 mx-auto text-brand-gray dark:text-brand-white/50 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <p className="text-brand-navy dark:text-brand-white text-lg">
              No vehicles available yet.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 text-sm mt-2">
              Check back soon!
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}