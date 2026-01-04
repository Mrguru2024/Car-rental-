import { createClient } from "@/lib/supabase/server";
import VehicleCard from "@/components/Vehicle/VehicleCard";
import { seedVehicles } from "@/lib/data/seed-vehicles";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import NearbySearchButton from "@/components/Search/NearbySearchButton";
import ResetFiltersButton from "@/components/Search/ResetFiltersButton";
import Link from "next/link";
import MileageSlider from "./MileageSlider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Vehicles",
  description:
    "Browse available vehicles for rent on Carsera. Find the perfect car, truck, or SUV from trusted local dealers in Atlanta.",
  openGraph: {
    title: "Browse Vehicles | Carsera",
    description:
      "Browse available vehicles for rent on Carsera. Find the perfect car, truck, or SUV from trusted local dealers in Atlanta.",
    type: "website",
    siteName: "Carsera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Vehicles | Carsera",
    description:
      "Browse available vehicles for rent on Carsera. Find the perfect car, truck, or SUV from trusted local dealers in Atlanta.",
  },
};

interface SearchParams {
  location?: string;
  start_date?: string;
  end_date?: string;
  min_mileage_limit?: string;
  max_mileage_limit?: string;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const {
    location,
    start_date,
    end_date,
    min_mileage_limit,
    max_mileage_limit,
  } = params;

  // Normalize max_mileage_limit - treat "unlimited" or empty as no max filter
  const hasMaxLimit =
    max_mileage_limit &&
    max_mileage_limit !== "unlimited" &&
    max_mileage_limit !== "";

  // Build query
  let query = supabase
    .from("vehicles")
    .select("*, vehicle_photos(file_path)")
    .eq("status", "active");

  // Apply filters
  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  // Apply mileage limit filters
  if (min_mileage_limit) {
    const minMiles = parseInt(min_mileage_limit);
    if (!isNaN(minMiles) && minMiles > 0) {
      // Include vehicles with no limit (null) or limit >= min
      query = query.or(`mileage_limit.is.null,mileage_limit.gte.${minMiles}`);
    }
  }
  if (hasMaxLimit) {
    const maxMiles = parseInt(max_mileage_limit!);
    if (!isNaN(maxMiles)) {
      // Filter out vehicles with limit > max (keep null and <= max)
      query = query.or(`mileage_limit.is.null,mileage_limit.lte.${maxMiles}`);
    }
  }
  // If max_mileage_limit is "unlimited" or empty, don't filter by max (show all including unlimited)

  const { data: vehicles, error } = await query.order("created_at", {
    ascending: false,
  });

  // If no vehicles in database, use seed data as placeholder
  let displayVehicles =
    vehicles && vehicles.length > 0
      ? vehicles
      : seedVehicles.map((v, idx) => {
          const { id: _id, ...rest } = v;
          return {
            ...rest,
            id: `placeholder-${idx}`,
            status: "active" as const,
            vehicle_photos: [],
            created_at: new Date().toISOString(),
          };
        });

  // Fetch images for placeholder vehicles using fallback system
  if (displayVehicles && (!vehicles || vehicles.length === 0)) {
    const { getVehicleDisplayImage } = await import('@/lib/images/getVehicleDisplayImage');
    const vehiclesWithImages = await Promise.all(
      displayVehicles.map(async (vehicle: any) => {
        const imageResult = await getVehicleDisplayImage(
          vehicle.id,
          vehicle.make,
          vehicle.model,
          vehicle.year
        );
        return {
          ...vehicle,
          _displayImage: imageResult.url, // Store image URL for client component
        };
      })
    );
    displayVehicles = vehiclesWithImages;
  }

  // Apply location filter to seed/placeholder vehicles (client-side)
  if (location && displayVehicles.length > 0) {
    const locationLower = location.toLowerCase().trim();
    displayVehicles = displayVehicles.filter((v: any) => {
      if (!v.location) return false;
      return v.location.toLowerCase().includes(locationLower);
    });
  }

  // Filter by date availability if dates provided
  let filteredVehicles = displayVehicles;
  if (start_date && end_date && displayVehicles.length > 0) {
    // Check for overlapping bookings
    // Get all vehicles that have conflicting bookings
    const vehicleIds = displayVehicles
      .map((v: any) => v.id)
      .filter(
        (id: string) => !id.startsWith("placeholder") && !id.startsWith("seed-")
      );

    if (vehicleIds.length > 0) {
      const { data: conflictingBookings } = await supabase
        .from("bookings")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds)
        .in("status", ["pending_payment", "confirmed"])
        .lte("start_date", end_date)
        .gte("end_date", start_date);

      const unavailableVehicleIds = new Set(
        conflictingBookings?.map((b: any) => b.vehicle_id) || []
      );

      filteredVehicles = displayVehicles.filter(
        (v: any) => !unavailableVehicleIds.has(v.id)
      );
    }
    // Note: Seed/placeholder vehicles are always available (no booking conflicts)
  }

  // Apply mileage limit filters to all vehicles (client-side for seed, already applied to DB vehicles)
  if ((min_mileage_limit || hasMaxLimit) && filteredVehicles.length > 0) {
    filteredVehicles = filteredVehicles.filter((v: any) => {
      const mileageLimit = v.mileage_limit;

      if (min_mileage_limit) {
        const minMiles = parseInt(min_mileage_limit);
        if (!isNaN(minMiles) && minMiles > 0) {
          // If vehicle has no limit (null/undefined), include it. Otherwise check if >= min
          if (
            mileageLimit !== null &&
            mileageLimit !== undefined &&
            mileageLimit < minMiles
          ) {
            return false;
          }
        }
      }

      if (hasMaxLimit) {
        const maxMiles = parseInt(max_mileage_limit!);
        if (!isNaN(maxMiles)) {
          // If vehicle has no limit (null/undefined), include it. Otherwise check if <= max
          if (
            mileageLimit !== null &&
            mileageLimit !== undefined &&
            mileageLimit > maxMiles
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 xs:py-6 sm:py-8 lg:py-10">
        {/* Page Header */}
        <div className="mb-4 xs:mb-6 sm:mb-8">
          <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Browse Vehicles
          </h1>
          <p className="text-xs xs:text-sm sm:text-base lg:text-lg text-brand-gray dark:text-brand-white/70">
            Find your perfect rental vehicle in Atlanta
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-brand-navy-light rounded-lg shadow-md dark:shadow-brand-navy/30 p-3 xs:p-4 sm:p-6 mb-4 xs:mb-6 sm:mb-8 border border-brand-white dark:border-brand-navy/50 w-full">
          <form
            action="/listings"
            method="get"
            className="grid grid-cols-1 fold:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 xs:gap-4 w-full max-w-full"
          >
            <div className="fold:col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 w-full min-w-0">
              <label
                htmlFor="search-location"
                className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1.5"
              >
                Location
              </label>
              <div className="relative w-full">
                <input
                  id="search-location"
                  type="text"
                  name="location"
                  placeholder="Atlanta, GA"
                  className="w-full px-3 sm:px-4 py-2 pr-24 sm:pr-28 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 text-sm sm:text-base"
                  defaultValue={location || "Atlanta, GA"}
                  suppressHydrationWarning
                />
                <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-10">
                  <NearbySearchButton inputId="search-location" />
                </div>
              </div>
            </div>
            <div className="w-full min-w-0">
              <label
                htmlFor="search-start-date"
                className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1.5"
              >
                Start Date
              </label>
              <input
                id="search-start-date"
                type="date"
                name="start_date"
                className="w-full px-3 sm:px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 text-sm sm:text-base"
                defaultValue={start_date || ""}
                suppressHydrationWarning
              />
            </div>
            <div className="w-full min-w-0">
              <label
                htmlFor="search-end-date"
                className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1.5"
              >
                End Date
              </label>
              <input
                id="search-end-date"
                type="date"
                name="end_date"
                className="w-full px-3 sm:px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 text-sm sm:text-base"
                defaultValue={end_date || ""}
                suppressHydrationWarning
              />
            </div>
            <MileageSlider
              minMileage={min_mileage_limit}
              maxMileage={max_mileage_limit}
            />
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-1 xl:col-span-1 flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full min-w-0">
              <button
                type="submit"
                className="w-full xl:flex-1 px-4 py-2.5 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium text-sm sm:text-base whitespace-nowrap flex items-center justify-center min-h-[42px]"
                suppressHydrationWarning
              >
                Search
              </button>
              {(location ||
                start_date ||
                end_date ||
                min_mileage_limit ||
                hasMaxLimit) && <ResetFiltersButton />}
            </div>
          </form>
        </div>

        {/* Results Count */}
        {filteredVehicles && filteredVehicles.length > 0 && (
          <div className="mb-6">
            <p className="text-brand-gray dark:text-brand-white/70">
              {filteredVehicles.length}{" "}
              {filteredVehicles.length === 1 ? "vehicle" : "vehicles"} found
              {location && ` in ${location}`}
              {start_date &&
                end_date &&
                ` from ${new Date(
                  start_date
                ).toLocaleDateString()} to ${new Date(
                  end_date
                ).toLocaleDateString()}`}
            </p>
          </div>
        )}

        {/* Vehicle Grid */}
        {filteredVehicles && filteredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 fold:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 lg:gap-8">
            {filteredVehicles.map((vehicle: any) => (
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-brand-navy dark:text-brand-white mb-2">
              No vehicles found
            </h3>
            <p className="text-sm sm:text-base text-brand-gray dark:text-brand-white/70 mb-4">
              {location ||
              start_date ||
              end_date ||
              min_mileage_limit ||
              hasMaxLimit
                ? `Try adjusting your search filters.`
                : `No vehicles are currently available. Check back soon!`}
            </p>
            {(location ||
              start_date ||
              end_date ||
              min_mileage_limit ||
              hasMaxLimit) && (
              <Link
                href="/listings"
                className="inline-block px-6 py-2 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors"
              >
                Clear Filters
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
