export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Record<string, any>
          ip_address: string | null
          user_agent: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Record<string, any>
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Record<string, any>
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      security_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
          severity: 'low' | 'medium' | 'high' | 'critical'
          description: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Record<string, any>
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, any>
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, any>
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          role: 'dealer' | 'renter' | 'admin'
          full_name: string | null
          phone: string | null
          address: string | null
          verification_status: 'pending' | 'approved' | 'rejected'
          stripe_connect_account_id: string | null
          stripe_connect_account_status: 'pending' | 'active' | 'restricted' | 'rejected' | null
          verification_documents: Record<string, any> | null
          drivers_license_number: string | null
          drivers_license_state: string | null
          drivers_license_expiration: string | null
          business_name: string | null
          business_license_number: string | null
          business_address: string | null
          tax_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'dealer' | 'renter' | 'admin'
          full_name?: string | null
          phone?: string | null
          address?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          stripe_connect_account_id?: string | null
          stripe_connect_account_status?: 'pending' | 'active' | 'restricted' | 'rejected' | null
          verification_documents?: Record<string, any> | null
          drivers_license_number?: string | null
          drivers_license_state?: string | null
          drivers_license_expiration?: string | null
          business_name?: string | null
          business_license_number?: string | null
          business_address?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'dealer' | 'renter' | 'admin'
          full_name?: string | null
          phone?: string | null
          address?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          stripe_connect_account_id?: string | null
          stripe_connect_account_status?: 'pending' | 'active' | 'restricted' | 'rejected' | null
          verification_documents?: Record<string, any> | null
          drivers_license_number?: string | null
          drivers_license_state?: string | null
          drivers_license_expiration?: string | null
          business_name?: string | null
          business_license_number?: string | null
          business_address?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          dealer_id: string
          make: string
          model: string
          year: number
          price_per_day: number
          location: string
          description: string | null
          mileage_limit: number | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dealer_id: string
          make: string
          model: string
          year: number
          price_per_day: number
          location: string
          description?: string | null
          mileage_limit?: number | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dealer_id?: string
          make?: string
          model?: string
          year?: number
          price_per_day?: number
          location?: string
          description?: string | null
          mileage_limit?: number | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          renter_id: string
          vehicle_id: string
          start_date: string
          end_date: string
          total_price: number
          status: 'draft' | 'pending_payment' | 'confirmed' | 'canceled'
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          plan_fee_cents: number
          coverage_type: 'platform_plan' | 'byoi' | null
          dealer_payout_amount_cents: number | null
          platform_fee_cents: number | null
          stripe_transfer_id: string | null
          payout_status: 'pending' | 'transferred' | 'paid_out' | 'failed' | null
          payout_scheduled_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          renter_id: string
          vehicle_id: string
          start_date: string
          end_date: string
          total_price: number
          status?: 'draft' | 'pending_payment' | 'confirmed' | 'canceled'
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          plan_fee_cents?: number
          coverage_type?: 'platform_plan' | 'byoi' | null
          dealer_payout_amount_cents?: number | null
          platform_fee_cents?: number | null
          stripe_transfer_id?: string | null
          payout_status?: 'pending' | 'transferred' | 'paid_out' | 'failed' | null
          payout_scheduled_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          renter_id?: string
          vehicle_id?: string
          start_date?: string
          end_date?: string
          total_price?: number
          status?: 'draft' | 'pending_payment' | 'confirmed' | 'canceled'
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          plan_fee_cents?: number
          coverage_type?: 'platform_plan' | 'byoi' | null
          dealer_payout_amount_cents?: number | null
          platform_fee_cents?: number | null
          stripe_transfer_id?: string | null
          payout_status?: 'pending' | 'transferred' | 'paid_out' | 'failed' | null
          payout_scheduled_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      protection_plans: {
        Row: {
          id: string
          name: 'basic' | 'standard' | 'premium'
          display_name: string
          description: string | null
          daily_fee_cents: number
          deductible_cents: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: 'basic' | 'standard' | 'premium'
          display_name: string
          description?: string | null
          daily_fee_cents: number
          deductible_cents: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: 'basic' | 'standard' | 'premium'
          display_name?: string
          description?: string | null
          daily_fee_cents?: number
          deductible_cents?: number
          is_active?: boolean
          created_at?: string
        }
      }
      byoi_documents: {
        Row: {
          id: string
          renter_profile_id: string
          file_path: string
          policyholder_name: string
          policy_number: string | null
          insurer_name: string | null
          coverage_notes: string | null
          effective_date: string
          expiration_date: string
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          renter_profile_id: string
          file_path: string
          policyholder_name: string
          policy_number?: string | null
          insurer_name?: string | null
          coverage_notes?: string | null
          effective_date: string
          expiration_date: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          renter_profile_id?: string
          file_path?: string
          policyholder_name?: string
          policy_number?: string | null
          insurer_name?: string | null
          coverage_notes?: string | null
          effective_date?: string
          expiration_date?: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_insurance_elections: {
        Row: {
          id: string
          booking_id: string
          coverage_type: 'platform_plan' | 'byoi'
          protection_plan_id: string | null
          plan_fee_cents: number
          deductible_cents: number
          coverage_snapshot_json: Json
          byoi_document_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          coverage_type: 'platform_plan' | 'byoi'
          protection_plan_id?: string | null
          plan_fee_cents?: number
          deductible_cents?: number
          coverage_snapshot_json?: Json
          byoi_document_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          coverage_type?: 'platform_plan' | 'byoi'
          protection_plan_id?: string | null
          plan_fee_cents?: number
          deductible_cents?: number
          coverage_snapshot_json?: Json
          byoi_document_id?: string | null
          created_at?: string
        }
      }
      liability_acceptances: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          acceptance_text_version: string
          acceptance_text: string
          typed_full_name: string
          accepted_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          user_id: string
          acceptance_text_version: string
          acceptance_text: string
          typed_full_name: string
          accepted_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          user_id?: string
          acceptance_text_version?: string
          acceptance_text?: string
          typed_full_name?: string
          accepted_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      claims: {
        Row: {
          id: string
          booking_id: string
          renter_profile_id: string
          coverage_type: 'platform_plan' | 'byoi'
          incident_datetime: string
          description: string
          police_report_file_path: string | null
          status: 'submitted' | 'in_review' | 'closed'
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          renter_profile_id: string
          coverage_type: 'platform_plan' | 'byoi'
          incident_datetime: string
          description: string
          police_report_file_path?: string | null
          status?: 'submitted' | 'in_review' | 'closed'
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          renter_profile_id?: string
          coverage_type?: 'platform_plan' | 'byoi'
          incident_datetime?: string
          description?: string
          police_report_file_path?: string | null
          status?: 'submitted' | 'in_review' | 'closed'
          admin_notes?: string | null
          created_at?: string
        }
      }
      claim_photos: {
        Row: {
          id: string
          claim_id: string
          file_path: string
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          file_path: string
          created_at?: string
        }
        Update: {
          id?: string
          claim_id?: string
          file_path?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}