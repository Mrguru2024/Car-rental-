/**
 * Booking Eligibility API
 * POST /api/bookings/eligibility
 * Checks if a renter is eligible to book a specific vehicle
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  validateBookingEligibility,
  type BookingEligibilityInput,
} from "@/lib/vehicle-tiers";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicle_id, renter_id, dates, insurance_choice } = body;

    if (!vehicle_id) {
      return NextResponse.json(
        { error: "vehicle_id is required" },
        { status: 400 }
      );
    }

    // Get renter profile
    const renterProfileId = renter_id
      ? renter_id
      : (
          await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single()
        ).data?.id;

    if (!renterProfileId) {
      return NextResponse.json(
        { error: "Renter profile not found" },
        { status: 404 }
      );
    }

    const adminSupabase = createAdminClient();

    // Get vehicle
    const { data: vehicle, error: vehicleError } = await adminSupabase
      .from("vehicles")
      .select(
        "id, year, vehicle_tier, title_type, inspection_status, status, dealer_id"
      )
      .eq("id", vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Get renter info
    const { data: renterProfile } = await adminSupabase
      .from("profiles")
      .select("id, verification_status")
      .eq("id", renterProfileId)
      .single();

    if (!renterProfile) {
      return NextResponse.json(
        { error: "Renter profile not found" },
        { status: 404 }
      );
    }

    // Get renter standing (from trust profile or compute)
    let renterStandingGrade: "A" | "B" | "C" | "D" | "F" | undefined;
    let isFlagged = false;

    try {
      // Get reviews for renter
      const { data: reviews } = await adminSupabase
        .from("renter_reviews")
        .select("rating, tags")
        .eq("renter_id", renterProfileId);

      // Calculate average rating
      const avgRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
            reviews.length
          : 0;

      // Get complaint count
      const { count: complaintCount } = await adminSupabase
        .from("dealer_complaints")
        .select("id", { count: "exact", head: true })
        .eq("renter_id", renterProfileId)
        .in("status", ["submitted", "under_review", "resolved"]);

      // Determine advisory status
      const advisoryStatus =
        (complaintCount || 0) > 2 ||
        (avgRating < 2.5 && (reviews?.length || 0) > 3)
          ? "watchlisted"
          : "none";

      // Type as union to allow for future 'restricted' value
      const advisory: "none" | "watchlisted" | "restricted" = advisoryStatus as
        | "none"
        | "watchlisted"
        | "restricted";

      isFlagged = advisory !== "none";

      // Compute standing grade (simplified - can be enhanced)
      if (avgRating >= 4.5 && (complaintCount || 0) === 0) {
        renterStandingGrade = "A";
      } else if (avgRating >= 4.0 && (complaintCount || 0) <= 1) {
        renterStandingGrade = "B";
      } else if (avgRating >= 3.0 && (complaintCount || 0) <= 2) {
        renterStandingGrade = "C";
      } else if (avgRating >= 2.0 && (complaintCount || 0) <= 3) {
        renterStandingGrade = "D";
      } else {
        renterStandingGrade = "F";
      }
    } catch (error) {
      // If trust profile computation fails, continue with defaults
      console.warn("Failed to compute trust profile:", error);
    }

    // Get dealer policy
    let dealerPolicy = null;
    if (vehicle.dealer_id) {
      const { data: policy } = await adminSupabase
        .from("dealer_rental_policies")
        .select("*")
        .eq("dealer_id", vehicle.dealer_id)
        .maybeSingle();

      dealerPolicy = policy;
    }

    // Get screening summary
    const { data: mvrScreening } = await adminSupabase
      .from("screenings")
      .select("status")
      .eq("user_id", renterProfileId)
      .eq("type", "mvr")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: softCreditScreening } = await adminSupabase
      .from("screenings")
      .select("status")
      .eq("user_id", renterProfileId)
      .eq("type", "soft_credit")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const screeningSummary = {
      has_mvr: !!mvrScreening,
      mvr_status: mvrScreening?.status,
      has_soft_credit: !!softCreditScreening,
      soft_credit_status: softCreditScreening?.status,
    };

    // Build eligibility input
    const eligibilityInput: BookingEligibilityInput = {
      vehicle: {
        id: vehicle.id,
        vehicle_tier: vehicle.vehicle_tier as any,
        year: vehicle.year,
        title_type: vehicle.title_type as any,
        inspection_status: vehicle.inspection_status as any,
        status: vehicle.status,
      },
      renter: {
        id: renterProfileId,
        standing_grade: renterStandingGrade,
        is_flagged: isFlagged,
        verification_status: renterProfile.verification_status,
      },
      dealerPolicy: dealerPolicy
        ? {
            min_vehicle_year: dealerPolicy.min_vehicle_year,
            allowed_vehicle_tiers: dealerPolicy.allowed_vehicle_tiers as any[],
            min_renter_standing_grade:
              dealerPolicy.min_renter_standing_grade as any,
            block_flagged_renters: dealerPolicy.block_flagged_renters,
            require_mvr_for_tier3: dealerPolicy.require_mvr_for_tier3,
            require_mvr_for_tier4: dealerPolicy.require_mvr_for_tier4,
            require_soft_credit_for_tier3:
              dealerPolicy.require_soft_credit_for_tier3,
            require_soft_credit_for_tier4:
              dealerPolicy.require_soft_credit_for_tier4,
            require_manual_approval: dealerPolicy.require_manual_approval,
          }
        : undefined,
      screeningSummary,
      insuranceSelection: insurance_choice
        ? {
            type: insurance_choice as any,
          }
        : undefined,
    };

    const result = validateBookingEligibility(eligibilityInput);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Booking eligibility error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
